
import os
import re
import sys
import json
import time
import tempfile
import shutil
import threading
import signal

from multiprocessing import Process, Queue

import websocket
import pandas as pd
import numpy as np

from .enums import SimWorkerStatus
from .sim import SimStatus, SimTrace,SimTraceMeta, SimStepTrace, TraceTarget
from .utils import ExtendedJSONEncoder
from .nf_sim import NfSim
from .steps_sim import StepsSim
from .logger import get_logger


L = get_logger(__name__)

BNG_MODEL_EXPORT_TIMEOUT = 5


class SimWorker():
    def __init__(self):
        self.sim_proc = None
        self.sim_thread = None
        self.sim_queue = Queue()
        self.status = SimWorkerStatus.READY

    def init(self):
        MASTER_HOST = os.environ['MASTER_HOST']
        self.socket = websocket.WebSocketApp('ws://{}:8000/sim'.format(MASTER_HOST),
                                             on_open=self.on_open,
                                             on_message=self.on_message,
                                             on_error=self.on_error,
                                             on_close=self.on_close
                                             )
        def on_terminate(signal, frame):
            L.debug('received main process shutdown signal for pid: {}'.format(os.getpid()))
            L.debug('doing nothing so far')
            # TODO: investigate if the socket should be closed here

        # TODO: SIGINT handler?
        signal.signal(signal.SIGTERM, on_terminate)

        self.socket.run_forever()

    def on_open(self):
        L.debug('ws connection open')
        self.send_message('status', SimWorkerStatus.READY)

    def on_message(self, raw_message):
        message = json.loads(raw_message)
        sim_config = message['data']
        msg = message['cmd']
        L.debug('got {} from the backend'.format(msg))

        if msg == 'run_sim':
            self.on_run_sim_msg(sim_config)

        if msg == 'cancel_sim':
            self.on_cancel_sim_msg()

    def on_cancel_sim_msg(self):
        L.debug('send SIGTERM to simulation process')
        self.sim_proc.terminate()

    def on_run_sim_msg(self, sim_config):
        self.send_message('status', SimWorkerStatus.BUSY)

        def wait_for_sim_result():
            L.debug('creating process to run a sim')
            self.sim_proc = Process(target=run_sim_proc, args=(self.sim_queue, sim_config))
            self.sim_proc.start()
            L.debug('start loop to get sim data from MP queue')

            sim_running = True
            while sim_running:
                sim_data = self.sim_queue.get()
                if sim_data is not None:
                    sim_data_dict = sim_data.to_dict()
                    sim_data_dict.update({
                        'id': sim_config['id'],
                        'userId': sim_config['userId']
                    })
                    self.send_message(sim_data.type, sim_data_dict)
                else:
                    sim_running = False

            L.debug('joining simulator process')
            self.sim_proc.join()
            self.sim_proc = None
            # TODO: consider recreaction of proc_queue
            # might it be damaged after process terminates?
            self.send_message('status', SimWorkerStatus.READY)

        L.debug('starting a thread')
        self.sim_thread = threading.Thread(target=wait_for_sim_result)
        self.sim_thread.start()

    def on_error(self, error):
        L.debug('ws: error {}'.format(error))

    def on_close(self):
        L.debug('ws connection closed, trying to connect in 2 s')
        time.sleep(2)
        self.init()

    def send_message(self, message, data):
        payload = json.dumps({
            'message': message,
            'data': data
        }, cls=ExtendedJSONEncoder)
        L.debug('sending {} to the backend'.format(message))
        self.socket.send(payload)


def run_sim_proc(result_queue, sim_config):
    def on_sigterm(signal, frame):
        L.debug('got SIGTERM on simulation process')
        result_queue.put(None)
        sys.exit(0)

    signal.signal(signal.SIGTERM, on_sigterm)

    tmp_dir = tempfile.mkdtemp()
    os.chdir(tmp_dir)

    L.debug('sim proc started')
    try:
        if sim_config['solver'] == 'nfsim':
            sim = NfSim(sim_config)
        elif sim_config['solver'] == 'steps':
            sim = StepsSim(sim_config)
        else:
            raise NotImplementedError('solver {} is not supported'.format(sim_config['solver']))

        sim_trace_gen = sim.run()

        for result in sim_trace_gen:
            result_queue.put(result)
        result_queue.put(None)

    except Exception as error:
        L.debug('Sim error')
        L.exception(error)
        sim_status = SimStatus(SimStatus.ERROR, description=str(error))
        result_queue.put(sim_status)
        result_queue.put(None)

    shutil.rmtree(tmp_dir)