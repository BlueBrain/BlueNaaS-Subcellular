
import os
import json
import signal

import tornado

from .enums import SimWorkerStatus
from .sim import SimProgress, SimStatus, SimTrace, SimStepTrace, SimLogMessage, SimSpatialStepTrace, SimLog
from .logger import get_logger


L = get_logger(__name__)


def on_terminate(signal, frame):
    L.debug('received shutdown signal')
    tornado.ioloop.IOLoop.current().stop()

signal.signal(signal.SIGINT, on_terminate)
signal.signal(signal.SIGTERM, on_terminate)

class SimWorker():
    def __init__(self, worker_websocket):
        self.ws = worker_websocket
        self.status = SimWorkerStatus.BUSY
        self.sim_conf = None



class SimManager():
    def __init__(self, db):
        self.workers = []
        self.clients = dict()
        self.sim_conf_queue = []
        self.db = db

    def add_worker(self, worker):
        self.workers.append(worker)
        L.debug('added one sim worker')
        self.on_worker_change()

    def remove_worker(self, worker):
        if worker.status == SimWorkerStatus.BUSY:
            self.process_sim_status(worker.sim_conf, SimStatus.ERROR)
        self.workers.remove(worker)
        L.debug('worker has been removed')
        self.on_worker_change()

    def on_worker_change(self):
        free_workers_num = len(self.get_free_workers())
        workers_num = len(self.workers)
        L.debug('workers: {}, free: {}'.format(workers_num, free_workers_num))

    def get_free_workers(self):
        return [worker for worker in self.workers if worker.status == SimWorkerStatus.READY]

    def add_client(self, user_id, ws):
        if user_id not in self.clients:
            self.clients[user_id] = [ws]
        elif ws not in self.clients[user_id]:
            self.clients[user_id].append(ws)
        L.debug('connection for client {} has been added'.format(user_id))

    def remove_client(self, user_id, ws):
        self.clients[user_id].remove(ws)
        L.debug('connection for client {} has been removed'.format(user_id))

    def process_worker_message(self, worker, msg, data, cmdid=None):
        if msg == 'status':
            status = data
            worker.status = status
            if status == SimWorkerStatus.READY:
                worker.sim_conf = None
            L.debug('sim worker reported as {}'.format(data))
            self.on_worker_change()
            self.run_available()
        elif msg == SimProgress.TYPE:
            self.process_sim_progress(worker.sim_conf, data['progress'])
        elif msg == SimStepTrace.TYPE:
            self.process_sim_step_trace(worker.sim_conf, data)
        elif msg == SimTrace.TYPE:
            self.process_sim_trace(worker.sim_conf, data)
        elif msg == SimStatus.TYPE:
            self.process_sim_status(worker.sim_conf, data['status'], data)
        elif msg == SimLogMessage.TYPE:
            self.process_sim_log_msg(worker.sim_conf, data)
        elif msg == SimLog.TYPE:
            self.process_sim_log(worker.sim_conf, data)
        elif msg == SimSpatialStepTrace.TYPE:
            self.process_sim_spatial_step_trace(worker.sim_conf, data)
        elif msg == 'tmp_sim_log':
            # TODO: refactor
            tmp_sim_log = {
                'log': data,
                'userId': worker.sim_conf['userId'],
                'simId': worker.sim_conf['id']
            }
            self.send_message(worker.sim_conf['userId'], 'tmp_sim_log', tmp_sim_log, cmdid=cmdid)
        elif msg == 'tmp_sim_trace':
            tmp_sim_trace = {
                **data,
                'userId': worker.sim_conf['userId'],
                'simId': worker.sim_conf['id']
            }
            self.send_message(worker.sim_conf['userId'], 'tmp_sim_trace', tmp_sim_trace, cmdid=cmdid)

    def schedule_sim(self, sim_conf):
        L.debug('scheduling a simulation')
        self.sim_conf_queue.append(sim_conf)
        self.process_sim_status(sim_conf, SimStatus.QUEUED)
        self.run_available()

    def get_running_sim_ids(self):
        return [
            worker.sim_conf['id']
            for worker
            in self.workers
            if worker.status == SimWorkerStatus.BUSY
        ]

    def request_tmp_sim_log(self, sim_id, cmdid):
        worker = next((
            worker
            for worker
            in self.workers
            if worker.sim_conf and worker.sim_conf['id'] == sim_id
        ), None)

        if worker:
            worker.ws.send_message('get_tmp_sim_log', cmdid=cmdid)

    def request_tmp_sim_trace(self, sim_id, cmdid):
        worker = next((
            worker
            for worker
            in self.workers
            if worker.sim_conf['id'] == sim_id
        ), None)

        if worker:
            worker.ws.send_message('get_tmp_sim_trace', cmdid=cmdid)

    def cancel_sim(self, sim_conf):
        sim_id = sim_conf['id']
        queue_idx = next((
            index
            for (index, sim_conf)
            in enumerate(self.sim_conf_queue)
            if sim_conf['id'] == sim_id
        ), None)

        self.process_sim_status(sim_conf, SimStatus.CANCELLED)

        if queue_idx is not None:
            L.debug('sim to cancel is in queue, id: {}'.format(queue_idx))
            self.sim_conf_queue.pop(queue_idx)
            return

        worker = next((
            worker
            for worker
            in self.workers
            if worker.sim_conf and worker.sim_conf['id'] == sim_id
        ), None)

        if not worker:
            L.debug('sim to cancel is not in the queue')
            return

        L.debug('sending message to worker to cancel the sim')
        worker.ws.send_message('cancel_sim')

    def process_sim_status(self, sim_conf, status, context={}):
        user_id = sim_conf['userId']
        sim_id = sim_conf['id']
        self.db.update_simulation({
            **context,
            'id': sim_id,
            'userId': user_id,
            'status': status
        })

        self.send_sim_status(sim_conf, status, context=context)

    def process_sim_progress(self, sim_conf, progress, context={}):
        user_id = sim_conf['userId']
        sim_id = sim_conf['id']
        self.db.update_simulation({
            **context,
            'id': sim_id,
            'userId': user_id,
            'progress': progress
        })

        self.send_message(user_id, SimProgress.TYPE, {
            **context,
            'simId': sim_conf['id'],
            'progress': progress
        })

    def process_sim_log_msg(self, sim_conf, log_msg):
        self.send_message(sim_conf['userId'], SimLogMessage.TYPE, {
            **log_msg,
            'simId': sim_conf['id']
        })

    def process_sim_log(self, sim_conf, sim_log):
        user_id = sim_conf['userId']
        sim_id = sim_conf['id']

        log = {
            'log': sim_log,
            'userId': user_id,
            'simId': sim_id
        }

        self.db.create_sim_log(log)
        # TODO: do we need to send whole log at the end of a simulation?
        self.send_message(sim_conf['userId'], SimLog.TYPE, log)

    def process_sim_spatial_step_trace(self, sim_conf, spatial_step_trace):
        user_id = sim_conf['userId']

        self.db.create_sim_spatial_step_trace({
            **spatial_step_trace,
            'userId': user_id,
            'simId': sim_conf['id']
        })

        self.send_message(sim_conf['userId'], SimSpatialStepTrace.TYPE, {
            **spatial_step_trace,
            'simId': sim_conf['id']
        })

    def process_sim_step_trace(self, sim_conf, step_trace):
        msg = {
            **step_trace,
            'simId': sim_conf['id']
        }
        self.send_message(sim_conf['userId'], SimStepTrace.TYPE, msg)

    def process_sim_trace(self, sim_conf, sim_trace):
        user_id = sim_conf['userId']
        sim_id = sim_conf['id']

        self.db.create_sim_trace({
            **sim_trace,
            'simId': sim_id,
            'userId': user_id,
        })

        status_message = {
            'simId': sim_id,
            'userId': user_id,
            'status': SimStatus.FINISHED
        }

        status_message.update(sim_trace)
        self.send_message(user_id, SimTrace.TYPE, status_message)

    def send_sim_status(self, sim_conf, status, context={}):
        self.send_message(sim_conf['userId'], SimStatus.TYPE, {
            **context,
            'simId': sim_conf['id'],
            'status': status
        })

    def send_message(self, user_id, name, message, cmdid=None):
        if user_id not in self.clients:
            return

        connections = self.clients[user_id]
        for connection in connections:
            connection.send_message(name, message, cmdid=cmdid)

    def run_available(self):
        if len(self.sim_conf_queue) is 0:
            L.debug('sim queueu is empty, nothing to run')
            return

        L.debug('{} simulations in the queue'.format(len(self.sim_conf_queue)))
        free_workers = self.get_free_workers()
        if len(free_workers) is 0:
            L.debug('all workers are busy')
            return

        worker = free_workers[0]
        sim_conf = self.sim_conf_queue.pop(0)

        worker.status = SimWorkerStatus.BUSY
        worker.sim_conf = sim_conf
        L.debug('ready to run simulation, sending sim config to sim worker')
        worker.ws.send_message('run_sim', sim_conf)

        self.run_available()
