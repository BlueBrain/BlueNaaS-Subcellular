import os
import sys
import json
import tempfile
import shutil
import threading
import signal
import asyncio
from threading import Thread
from multiprocessing import Process, Queue
from collections import defaultdict
from typing import Optional, Any, Dict, List, Union
from types import FrameType
import itertools

import sentry_sdk
from sentry_sdk import capture_message
from tornado.websocket import websocket_connect, WebSocketClosedError, WebSocketClientConnection

from .worker_message import WorkerStatus
from .sim import SimStatus, SimLogMessage, SimData
from .utils import ExtendedJSONEncoder
from .nf_sim import NfSim
from .steps_sim import StepsSim
from .logger import get_logger, log_many
from .envvars import SENTRY_DSN, MASTER_HOST

if SENTRY_DSN is not None:
    sentry_sdk.init(
        SENTRY_DSN,
        traces_sample_rate=1.0,
    )

L = get_logger(__name__)


class SimWorker:
    def __init__(self) -> None:
        self.sim_proc: Optional[Process] = None
        self.sim_thread: Optional[Thread] = None
        self.sim_queue: Queue = Queue(10)
        self.terminating = False
        self.status: WorkerStatus = "ready"
        self.socket: Optional[WebSocketClientConnection] = None
        self.sim_log: Dict[str, List[str]] = defaultdict(list)
        self.sim_config: dict = {}
        self.closed = True
        self.loop = asyncio.new_event_loop()

    def init(self) -> None:
        signal.signal(signal.SIGTERM, self.on_terminate)
        self.loop.run_until_complete(self.listen())

    async def listen(self) -> None:
        await self.ws_connect()
        while True:
            msg = await self.socket.read_message()  # type: ignore
            if msg is not None:
                self.on_message(msg)
                continue

            self.closed = True
            L.debug("Backend ws closed")
            await self.ws_connect()

    async def ws_connect(self) -> None:
        for wait in itertools.chain([1, 2, 4, 8, 15, 30], itertools.repeat(60)):
            try:
                self.socket = await websocket_connect(
                    f"ws://{MASTER_HOST}:8000/sim",
                    max_message_size=100 * 1024 * 1024,
                )
                break
            except Exception as e:
                L.debug(f"Connection refused retrying in {wait} s")
                L.exception(e)
                await asyncio.sleep(wait)

        self.closed = False
        L.debug("ws connection open")
        self.send_message("status", "ready" if self.sim_proc is None else "busy")
        self.send_message("worker_connect", self.sim_config)

    def teardown(self) -> None:
        if self.socket is not None:
            self.socket.close()
        sys.exit(0)

    def on_message(self, raw_message: Union[bytes, str]) -> None:
        message = json.loads(raw_message)

        if any(key not in message for key in ["data", "cmd", "cmdid"]):
            raise ValueError("Invalid message")

        sim_config = message["data"]
        msg = message["cmd"]
        cmdid = message["cmdid"]
        L.debug(f"got {msg} from the backend")

        if msg == "run_sim":
            self.on_run_sim_msg(sim_config)

        elif msg == "cancel_sim":
            self.on_cancel_sim_msg()

        elif msg == "get_tmp_sim_log":
            self.send_message("tmp_sim_log", {"log": self.sim_log}, cmdid=cmdid)

    def on_cancel_sim_msg(self) -> None:
        L.debug("send SIGTERM to simulation process")
        if self.sim_proc is not None:
            self.sim_proc.terminate()

    def wait_for_sim_result(self) -> None:
        if not self.sim_config:
            L.warning("No sim config")
            return

        L.debug("creating process to run a sim")
        self.sim_proc = Process(target=self.run_sim_proc)
        self.sim_proc.start()
        L.debug("start loop to get sim data from MP queue")

        while True:
            sim_data: SimData = self.sim_queue.get()

            if sim_data is None:
                break

            if isinstance(sim_data, SimLogMessage):
                self.sim_log[sim_data.source].append(sim_data.message)

            payload = {
                **sim_data.dict(),
                **{"simId": self.sim_config["id"], "userId": self.sim_config["userId"]},
            }

            self.send_message(sim_data.type, payload)

        L.debug("joining simulator process")
        self.sim_proc.join()
        self.sim_proc = None
        self.sim_config = {}

        self.send_message("simLog", {"log": self.sim_log})
        self.sim_log = defaultdict(list)

        if self.terminating:
            self.teardown()

        self.send_message("status", "ready")

    def on_run_sim_msg(self, sim_config: dict) -> None:
        self.send_message("status", "busy")
        self.sim_config = sim_config

        L.debug("starting a thread")
        self.sim_thread = threading.Thread(target=self.wait_for_sim_result)
        self.sim_thread.start()

    async def _send_message(self, message: str, data: Any, cmdid=None) -> None:
        if self.closed or self.socket is None:
            return

        payload = json.dumps(
            {"message": message, "data": data, "cmdid": cmdid},
            cls=ExtendedJSONEncoder,
        )

        try:
            await self.socket.write_message(payload)
        except (ConnectionError, WebSocketClosedError):
            log_many("web socket connection closed", L.error, capture_message)

    def send_message(self, message: str, data: Any, cmdid: Optional[int] = None) -> None:
        """Schedules a message to be sent, threadsafe."""
        if not self.loop.is_running():
            L.warning("No running loop")
            return

        asyncio.run_coroutine_threadsafe(self._send_message(message, data, cmdid), self.loop)

    def run_sim_proc(self) -> None:
        if not self.sim_config:
            L.warning("No sim config")
            return

        def on_sigterm(sig_num, frame):  # pylint: disable=unused-argument
            L.debug("got SIGTERM on simulation process")
            self.sim_queue.put(SimLogMessage(message="STOP"))
            self.sim_queue.put(None)
            sys.exit(0)

        signal.signal(signal.SIGTERM, on_sigterm)

        tmp_dir = tempfile.mkdtemp()
        os.chdir(tmp_dir)

        solver = self.sim_config.get("solver")

        if solver == "nfsim":
            sim: Union[NfSim, StepsSim] = NfSim(self.sim_config, self.sim_queue.put)
        elif solver == "steps":
            sim = StepsSim(self.sim_config, self.sim_queue.put)
        else:
            raise NotImplementedError(f"solver {solver} is not supported")

        L.debug("sim proc started")
        try:
            sim.run()
            self.sim_queue.put(None)
        except Exception as error:
            L.debug("Sim error")
            L.exception(error)
            sim_status = SimStatus(status="error")
            sim_log = SimLogMessage(message=str(error))
            self.sim_queue.put(sim_log)
            self.sim_queue.put(sim_status)
            self.sim_queue.put(None)

        shutil.rmtree(tmp_dir)

    def on_terminate(self, signum: int, frame: FrameType):  # pylint: disable=unused-argument
        L.debug("received main process shutdown signal")
        if not self.sim_proc and not self.sim_thread:
            L.debug("Closing socket and exiting")
            self.teardown()
        else:
            L.debug("Waiting for simulation to finish")
            self.terminating = True
