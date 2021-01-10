# pylint: disable=dangerous-default-value
from typing import Optional, List, Dict, Any
from collections import defaultdict

from tornado.websocket import WebSocketHandler

from .sim import (
    SimProgress,
    SimStatus,
    SimTrace,
    SimLogMessage,
    SimSpatialStepTrace,
    SimLog,
)
from .types import SimConfig, WorkerStatus
from .logger import get_logger
from .db import Db

L = get_logger(__name__)


class SimWorker:
    def __init__(self, worker_websocket: WebSocketHandler) -> None:
        self.ws = worker_websocket
        self.sim_conf: Optional[SimConfig] = None


class SimManager:
    def __init__(self, db: Db) -> None:
        self.workers: List[SimWorker] = []
        self.worker_by_sim_id: Dict[str, SimWorker] = {}
        self.clients: Dict[str, List[WebSocketHandler]] = defaultdict(list)
        self.sim_conf_queue: List[SimConfig] = []
        self.db = db

    def add_worker(self, worker: SimWorker) -> None:
        self.workers.append(worker)
        L.debug("added one sim worker")
        self.log_workers_status()

    async def remove_worker(self, worker: SimWorker) -> None:
        if worker.sim_conf is not None:
            await self.process_sim_status(
                worker.sim_conf.userId, worker.sim_conf.simId, SimStatus.ERROR
            )
        self.workers.remove(worker)
        L.debug("worker has been removed")
        self.log_workers_status()

    def log_workers_status(self) -> None:
        L.debug(f"workers: {len(self.workers)}, free: {len(self.free_workers)}")

    @property
    def free_workers(self) -> List[SimWorker]:
        return [worker for worker in self.workers if worker.sim_conf is None]

    def add_client(self, user_id: str, ws: WebSocketHandler) -> None:
        self.clients[user_id].append(ws)
        L.debug(f"connection for client {user_id} has been added")

    def remove_client(self, user_id: str, ws: WebSocketHandler) -> None:
        self.clients[user_id].remove(ws)
        L.debug("connection for client {user_id} has been removed")

    def prune_workers(self, worker: SimWorker, sim_config: SimConfig) -> None:
        """
        When a worker with a running sim reconnects find the old worker instance
        and assign it's config to the newly created one.
        """
        stale_worker = self.worker_by_sim_id.get(sim_config.id)

        if stale_worker is not None:
            self.workers.remove(stale_worker)

        self.worker_by_sim_id[sim_config.id] = worker
        worker.sim_conf = sim_config
        self.log_workers_status()

    async def process_worker_message(
        self, worker: SimWorker, msg: str, data: Any, cmdid=None
    ) -> None:

        if msg == "worker_connect":
            if data:
                L.info("worker_reconnected")
                sim_config = SimConfig(**data)
                self.prune_workers(worker, sim_config)
            return

        if msg == "status":
            status: WorkerStatus = data
            if status == "ready":
                worker.sim_conf = None
            L.debug(f"sim worker reported as {status}")
            self.log_workers_status()
            await self.run_available()
            return

        if worker.sim_conf is None:
            L.warning("Worker doesn't have a sim config")
            return

        if msg == SimProgress.TYPE:
            await self.process_sim_progress(worker.sim_conf, data["progress"])
        elif msg == SimTrace.TYPE:
            await self.process_sim_trace(worker.sim_conf, data)
        elif msg == SimStatus.TYPE:
            await self.process_sim_status(
                worker.sim_conf.userId, worker.sim_conf.simId, data["status"], data
            )
        elif msg == SimLogMessage.TYPE:
            await self.process_sim_log_msg(worker.sim_conf, data)
        elif msg == SimLog.TYPE:
            await self.process_sim_log(worker.sim_conf, data)
        elif msg == SimSpatialStepTrace.TYPE:
            await self.process_sim_spatial_step_trace(worker.sim_conf, data)
        elif msg == "tmp_sim_log":
            tmp_sim_log = {
                "log": data,
                "userId": worker.sim_conf.userId,
                "simId": worker.sim_conf.id,
            }
            await self.send_message(worker.sim_conf.userId, "tmp_sim_log", tmp_sim_log, cmdid=cmdid)
        elif msg == "tmp_sim_trace":
            tmp_sim_trace = {
                **data,
                "userId": worker.sim_conf.userId,
                "simId": worker.sim_conf.id,
            }
            await self.send_message(
                worker.sim_conf.userId, "tmp_sim_trace", tmp_sim_trace, cmdid=cmdid
            )

    async def schedule_sim(self, sim_conf: SimConfig) -> None:
        L.debug("scheduling a simulation")
        self.sim_conf_queue.append(sim_conf)
        await self.process_sim_status(sim_conf.userId, sim_conf.id, SimStatus.QUEUED)
        await self.run_available()

    @property
    def running_sim_ids(self) -> List[str]:
        return [worker.sim_conf.id for worker in self.workers if worker.sim_conf is not None]

    async def request_tmp_sim_log(self, sim_id, cmdid):
        worker = next(
            (
                worker
                for worker in self.workers
                if worker.sim_conf is not None and worker.sim_conf.id == sim_id
            ),
            None,
        )

        if worker:
            await worker.ws.send_message("get_tmp_sim_log", cmdid=cmdid)

    async def request_tmp_sim_trace(self, sim_id, cmdid):
        worker = next(
            (
                worker
                for worker in self.workers
                if worker.sim_conf is not None and worker.sim_conf.id == sim_id
            ),
            None,
        )

        if worker:
            await worker.ws.send_message("get_tmp_sim_trace", cmdid=cmdid)

    async def cancel_sim(self, sim_conf: dict):
        user_id = sim_conf["userId"]
        sim_id = sim_conf["id"]
        queue_idx = next(
            (
                index
                for (index, sim_conf) in enumerate(self.sim_conf_queue)
                if sim_conf.id == sim_id
            ),
            None,
        )

        await self.process_sim_status(user_id, sim_id, SimStatus.CANCELLED)

        if queue_idx is not None:
            L.debug(f"sim to cancel is in queue, id: {queue_idx}")
            self.sim_conf_queue.pop(queue_idx)
            return

        worker = next(
            (
                worker
                for worker in self.workers
                if worker.sim_conf is not None and worker.sim_conf.id == sim_id
            ),
            None,
        )

        if not worker:
            L.debug("sim to cancel is not in the queue")
            return

        L.debug("sending message to worker to cancel the sim")
        await worker.ws.send_message("cancel_sim")  # type: ignore

    async def process_sim_status(self, user_id: str, sim_id: str, status: str, context={}) -> None:
        await self.db.update_simulation(
            {**context, "id": sim_id, "userId": user_id, "status": status}
        )
        await self.send_sim_status(user_id, sim_id, status, context=context)

    async def process_sim_progress(self, sim_conf: SimConfig, progress, context={}):
        user_id = sim_conf.userId
        sim_id = sim_conf.id
        await self.db.update_simulation(
            {**context, "id": sim_id, "userId": user_id, "progress": progress}
        )

        await self.send_message(
            user_id, SimProgress.TYPE, {**context, "simId": sim_id, "progress": progress}
        )

    async def process_sim_log_msg(self, sim_conf: SimConfig, log_msg):
        await self.send_message(
            sim_conf.userId, SimLogMessage.TYPE, {**log_msg, "simId": sim_conf.id}
        )

    async def process_sim_log(self, sim_conf: SimConfig, sim_log):
        user_id = sim_conf.userId
        sim_id = sim_conf.id

        log = {"log": sim_log, "userId": user_id, "simId": sim_id}

        await self.db.create_sim_log(log)
        # TODO: do we need to send whole log at the end of a simulation?
        await self.send_message(user_id, SimLog.TYPE, log)

    async def process_sim_spatial_step_trace(self, sim_conf: SimConfig, spatial_step_trace) -> None:
        user_id = sim_conf.userId

        await self.db.create_sim_spatial_step_trace(
            {**spatial_step_trace, "userId": user_id, "simId": sim_conf.id}
        )

        await self.send_message(
            user_id,
            SimSpatialStepTrace.TYPE,
            {**spatial_step_trace, "simId": sim_conf.id},
        )

    async def process_sim_trace(self, sim_conf: SimConfig, sim_trace):
        user_id = sim_conf.userId
        sim_id = sim_conf.id

        if sim_trace["persist"]:
            await self.db.create_sim_trace(
                {
                    **sim_trace,
                    "simId": sim_id,
                    "userId": user_id,
                }
            )

        status_message = {"simId": sim_id, "userId": user_id, "status": SimStatus.FINISHED}

        status_message.update(sim_trace)
        if sim_trace["stream"]:
            await self.send_message(user_id, SimTrace.TYPE, status_message)

    async def send_sim_status(self, user_id: str, sim_id: str, status: str, context={}) -> None:
        await self.send_message(
            user_id,
            SimStatus.TYPE,
            {**context, "simId": sim_id, "status": status},
        )

    async def send_message(self, user_id, name, message, cmdid=None):
        for connection in self.clients[user_id]:
            await connection.send_message(name, message, cmdid=cmdid)

    async def run_available(self):
        if len(self.sim_conf_queue) == 0:
            L.debug("sim queueu is empty, nothing to run")
            return

        L.debug(f"{len(self.sim_conf_queue)} simulations in the queue")

        if len(self.free_workers) == 0:
            L.debug("all workers are busy")
            return

        worker = self.free_workers[0]
        worker.sim_conf = self.sim_conf_queue.pop(0)
        self.worker_by_sim_id[worker.sim_conf.id] = worker

        L.debug("ready to run simulation, sending sim config to sim worker")
        await worker.ws.send_message("run_sim", worker.sim_conf.dict())

        await self.run_available()
