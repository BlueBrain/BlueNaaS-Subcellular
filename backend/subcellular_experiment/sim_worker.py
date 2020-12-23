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
from typing import Optional, Any
from types import FrameType

from asyncio import AbstractEventLoop

import sentry_sdk
from sentry_sdk import capture_message
from tornado.websocket import websocket_connect, WebSocketClosedError, WebSocketClientConnection

from .enums import SimWorkerStatus
from .sim import SimStatus, SimTrace, SimStepTrace, SimLogMessage
from .utils import ExtendedJSONEncoder
from .nf_sim import NfSim
from .steps_sim import StepsSim
from .logger import get_logger, log_many
from .envvars import SENTRY_DSN

if SENTRY_DSN is not None:
    sentry_sdk.init(
        "https://252f85f1037f47bea93b31981043dd4c@o224246.ingest.sentry.io/5561238",
        traces_sample_rate=1.0,
    )

L = get_logger(__name__)

BNG_MODEL_EXPORT_TIMEOUT = 5


class SimTmpDataStore:
    def __init__(self):
        self.log = {}
        self.n_steps = 0
        self.observables = []
        self.times = []
        self.values = []

    def add(self, sim_data):
        if sim_data.TYPE == SimLogMessage.TYPE:
            self._add_log(sim_data)
        elif sim_data.TYPE == SimStepTrace.TYPE:
            self._add_step_trace(sim_data)
        elif sim_data.TYPE == SimTrace.TYPE:
            self._add_trace(sim_data)

    @property
    def trace(self):
        return {
            "nSteps": self.n_steps,
            "observables": self.observables,
            "times": self.times,
            "values": self.values,
        }

    def _add_log(self, sim_log_msg: SimLogMessage):
        source = sim_log_msg.source
        message = sim_log_msg.message

        if source not in self.log:
            self.log[source] = [message]
        else:
            self.log[source].append(message)

    def _add_step_trace(self, step_trace: SimStepTrace):
        self.n_steps = step_trace.step_idx + 1
        self.times.append(step_trace.t)
        self.values.append(step_trace.values)

        if not len(self.observables):
            self.observables = step_trace.observables

    def _add_trace(self, trace: SimTrace):
        self.observables = trace.observables
        self.times.append(trace.times)
        self.values.append(trace.values)
        # TODO: This is redundant, it can be derived from .times
        self.n_steps += len(trace.times)


class SimWorker:
    def __init__(self) -> None:
        self.sim_proc: Optional[Process] = None
        self.sim_thread: Optional[Thread] = None
        self.sim_queue: "Queue[Any]" = Queue(10)
        self.terminating = False
        self.status = SimWorkerStatus.READY
        self.socket: Optional[WebSocketClientConnection] = None
        self.sim_tmp_data_store: Optional[SimTmpDataStore] = None
        self.sim_config: dict = {}
        self.closed = True
        self.loop: Optional[AbstractEventLoop] = None

    def init(self) -> None:
        def on_terminate(signum: int, frame: FrameType):  # pylint: disable=unused-argument
            L.debug("received main process shutdown signal")
            if not self.sim_proc and not self.sim_thread:
                L.debug("Closing socket and exiting")
                self.teardown()
            else:
                L.debug("Waiting for simulation to finish")
                self.terminating = True

        # TODO: SIGINT handler?
        signal.signal(signal.SIGTERM, on_terminate)

        asyncio.run(self.ws_connect())

    async def ws_connect(self):
        MASTER_HOST = os.environ["MASTER_HOST"]
        self.socket = await websocket_connect(
            "ws://{}:8000/sim".format(MASTER_HOST),
            max_message_size=100 * 1024 * 1024,
        )

        await self.on_open()

        while True:
            msg = await self.socket.read_message()
            if msg is None:
                await self.on_close()
                break
            await self.on_message(msg)

    def teardown(self):
        self.socket.close()
        sys.exit(0)

    async def on_open(self):
        L.debug("ws connection open")
        self.closed = False
        await self.send_message(
            "status", SimWorkerStatus.READY if self.sim_proc is None else SimWorkerStatus.BUSY
        )
        await self.send_message("worker_connect", self.sim_config)

    async def on_message(self, raw_message) -> None:
        message = json.loads(raw_message)

        if any(key not in message for key in ["data", "cmd", "cmdid"]):
            raise ValueError("Invalid message")

        sim_config = message["data"]
        msg = message["cmd"]
        cmdid = message["cmdid"]
        L.debug(f"got {msg} from the backend")

        if msg == "run_sim":
            await self.on_run_sim_msg(sim_config)

        elif msg == "cancel_sim":
            self.on_cancel_sim_msg()

        elif msg == "get_tmp_sim_log" and self.sim_tmp_data_store is not None:
            await self.send_message("tmp_sim_log", self.sim_tmp_data_store.log, cmdid=cmdid)

        elif msg == "get_tmp_sim_trace" and self.sim_tmp_data_store is not None:
            await self.send_message("tmp_sim_trace", self.sim_tmp_data_store.trace, cmdid=cmdid)

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
            sim_data = self.sim_queue.get()
            if sim_data is None:
                break

            is_sim_trace = isinstance(sim_data, SimTrace)

            if is_sim_trace:
                data = sim_data.dict()
            elif self.sim_tmp_data_store is not None:
                self.sim_tmp_data_store.add(sim_data)
                data = sim_data.to_dict()

            payload = {
                **data,
                **{"simId": self.sim_config["id"], "userId": self.sim_config["userId"]},
            }

            self.schedule_message(sim_data.TYPE, payload)

        L.debug("joining simulator process")
        self.sim_proc.join()
        self.sim_proc = None
        self.sim_config = {}

        if self.sim_tmp_data_store is not None:
            self.schedule_message("simLog", self.sim_tmp_data_store.log)
        self.sim_tmp_data_store = None

        if self.terminating:
            self.teardown()

        self.schedule_message("status", SimWorkerStatus.READY)

    async def on_run_sim_msg(self, sim_config: dict) -> None:
        await self.send_message("status", SimWorkerStatus.BUSY)
        self.sim_tmp_data_store = SimTmpDataStore()
        self.sim_config = sim_config
        self.loop = asyncio.get_running_loop()

        L.debug("starting a thread")
        self.sim_thread = threading.Thread(target=self.wait_for_sim_result)
        self.sim_thread.start()

    async def on_close(self) -> None:
        self.closed = True
        L.debug("ws connection closed, trying to connect in 2 s")
        await asyncio.sleep(2)
        await self.ws_connect()

    async def send_message(self, message, data, cmdid=None) -> None:
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
            await self.on_close()

    def schedule_message(self, message: str, data: Any, cmdid=None) -> None:
        """Wraps send_message in a coroutine and schedules it for
        execution in the event loop. Can be run from other threads.
        """
        if not self.loop:
            L.warning("No running loop")
            return

        async def send_message():
            await self.send_message(message, data, cmdid)

        asyncio.run_coroutine_threadsafe(send_message(), self.loop)

    def run_sim_proc(self):
        if not self.sim_config:
            L.warning("No sim config")
            return

        def on_sigterm(sig_num, frame):  # pylint: disable=unused-argument
            L.debug("got SIGTERM on simulation process")
            self.sim_queue.put(SimLogMessage("STOP"))
            self.sim_queue.put(None)
            sys.exit(0)

        signal.signal(signal.SIGTERM, on_sigterm)

        tmp_dir = tempfile.mkdtemp()
        os.chdir(tmp_dir)

        solver = self.sim_config.get("solver")

        if solver == "nfsim":
            sim = NfSim(self.sim_config, self.sim_queue.put)
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
            sim_status = SimStatus(SimStatus.ERROR)
            sim_log = SimLogMessage(str(error))
            self.sim_queue.put(sim_log)
            self.sim_queue.put(sim_status)
            self.sim_queue.put(None)

        shutil.rmtree(tmp_dir)
