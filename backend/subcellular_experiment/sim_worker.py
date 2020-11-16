import os
import sys
import json
import time
import tempfile
import shutil
import threading
import signal
import socket
from multiprocessing import Process, Queue

import websocket

from .enums import SimWorkerStatus
from .sim import SimStatus, SimTrace, SimStepTrace, SimLogMessage
from .utils import ExtendedJSONEncoder
from .nf_sim import NfSim
from .steps_sim import StepsSim
from .logger import get_logger


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

    def get_log(self):
        return self.log

    def get_trace(self):
        return {"nSteps": self.n_steps, "observables": self.observables, "times": self.times, "values": self.values}

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
    def __init__(self):
        self.sim_proc = None
        self.sim_thread = None
        self.sim_queue = Queue(10)
        self.terminating = False
        self.status = SimWorkerStatus.READY

    def init(self):
        MASTER_HOST = os.environ["MASTER_HOST"]
        self.socket = websocket.WebSocketApp(
            "ws://{}:8000/sim".format(MASTER_HOST),
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close,
        )

        def on_terminate(signal, frame):
            L.debug("received main process shutdown signal")
            self.socket.keep_running = False
            if not self.sim_proc and not self.sim_thread:
                L.debug("Closing socket and exiting")
                self.teardown()
            else:
                L.debug("Waiting for simulation to finish")
                self.terminating = True

        # TODO: SIGINT handler?
        signal.signal(signal.SIGTERM, on_terminate)

        self.socket.run_forever(sockopt=((socket.IPPROTO_TCP, socket.TCP_NODELAY, 1),), ping_interval=30)

    def teardown(self):
        self.socket.close()
        sys.exit(0)

    def on_open(self):
        L.debug("ws connection open")
        self.send_message("status", SimWorkerStatus.READY)

    def on_message(self, raw_message):
        message = json.loads(raw_message)
        sim_config = message["data"]
        msg = message["cmd"]
        cmdid = message["cmdid"]
        L.debug("got {} from the backend".format(msg))

        if msg == "run_sim":
            self.on_run_sim_msg(sim_config)

        elif msg == "cancel_sim":
            self.on_cancel_sim_msg()

        elif msg == "get_tmp_sim_log":
            self.send_message("tmp_sim_log", self.sim_tmp_data_store.get_log(), cmdid=cmdid)

        elif msg == "get_tmp_sim_trace":
            self.send_message("tmp_sim_trace", self.sim_tmp_data_store.get_trace(), cmdid=cmdid)

    def on_cancel_sim_msg(self):
        L.debug("send SIGTERM to simulation process")
        self.sim_proc.terminate()

    def on_run_sim_msg(self, sim_config):
        self.send_message("status", SimWorkerStatus.BUSY)
        self.sim_tmp_data_store = SimTmpDataStore()

        def wait_for_sim_result():
            L.debug("creating process to run a sim")
            self.sim_proc = Process(target=run_sim_proc, args=(self.sim_queue, sim_config))
            self.sim_proc.start()
            L.debug("start loop to get sim data from MP queue")

            while True:
                sim_data = self.sim_queue.get()
                if sim_data is None:
                    break

                is_sim_trace = isinstance(sim_data, SimTrace)

                if is_sim_trace:

                    data = sim_data.dict()
                else:
                    self.sim_tmp_data_store.add(sim_data)
                    data = sim_data.to_dict()

                payload = {**data, **{"simId": sim_config["id"], "userId": sim_config["userId"]}}

                self.send_message(sim_data.TYPE, payload)

            L.debug("joining simulator process")
            self.sim_proc.join()
            self.sim_proc = None

            self.send_message("simLog", self.sim_tmp_data_store.get_log())
            # self.send_message("simTrace", self.sim_tmp_data_store.get_trace())

            self.sim_tmp_data_store = None

            if self.terminating:
                self.teardown()

            # TODO: consider recreation of proc_queue
            # might it be damaged after process terminates?
            self.send_message("status", SimWorkerStatus.READY)

        L.debug("starting a thread")
        self.sim_thread = threading.Thread(target=wait_for_sim_result)
        self.sim_thread.start()

    def on_error(self, error):
        if error != 0:
            L.debug("ws: error {}".format(error))

    def on_close(self):
        L.debug("ws connection closed, trying to connect in 2 s")
        time.sleep(2)
        self.init()

    def send_message(self, message, data, cmdid=None):
        payload = json.dumps({"message": message, "data": data, "cmdid": cmdid}, cls=ExtendedJSONEncoder)

        self.socket.send(payload)


def run_sim_proc(result_queue, sim_config):
    def on_sigterm(signal, frame):
        L.debug("got SIGTERM on simulation process")
        result_queue.put(SimLogMessage("STOP"))
        result_queue.put(None)
        sys.exit(0)

    signal.signal(signal.SIGTERM, on_sigterm)

    tmp_dir = tempfile.mkdtemp()
    os.chdir(tmp_dir)

    def progress_cb(result):
        result_queue.put(result)

    if sim_config["solver"] == "nfsim":
        sim = NfSim(sim_config, progress_cb)
    elif sim_config["solver"] == "steps":
        sim = StepsSim(sim_config, progress_cb)
    else:
        raise NotImplementedError("solver {} is not supported".format(sim_config["solver"]))

    L.debug("sim proc started")
    try:
        sim.run()
        result_queue.put(None)
    except Exception as error:
        L.debug("Sim error")
        L.exception(error)
        sim_status = SimStatus(SimStatus.ERROR)
        sim_log = SimLogMessage(str(error))
        result_queue.put(sim_log)
        result_queue.put(sim_status)
        result_queue.put(None)

    shutil.rmtree(tmp_dir)
