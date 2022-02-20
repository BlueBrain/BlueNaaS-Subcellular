# pylint: disable=dangerous-default-value
import os
from typing import Optional, List, Dict, Any
from collections import defaultdict
import json

from .sim import SimProgress, SimTrace, SimLogMessage, SimSpatialStepTrace, SimLog, SimStatus
from .worker_message import Status, SimWorkerMessage
from .types import (
    SimConfig,
    SimId,
    WebSocketHandler,
    UpdateSimulation,
    SimStatus as SimStatusLiteral,
)
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
            await self.process_sim_status(worker.sim_conf.userId, worker.sim_conf.simId, "error")
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

    async def process_worker_message(self, worker: SimWorker, msg: SimWorkerMessage) -> None:

        if msg.message == "worker_connect":
            if msg.data:
                L.info("worker_reconnected")
                sim_config = SimConfig(**msg.data)
                self.prune_workers(worker, sim_config)
            return

        if msg.message == "status":
            status = Status(**msg.dict())

            if status.data == "ready":
                worker.sim_conf = None
            L.debug(f"sim worker reported as {status.data}")
            self.log_workers_status()
            await self.run_available()
            return

        if worker.sim_conf is None:
            L.warning("Worker doesn't have a sim config")
            return

        if msg.message == "simProgress":
            sim_progress = SimProgress(**msg.data)
            await self.process_sim_progress(worker.sim_conf, sim_progress.progress)
        elif msg.message == "simTrace":
            sim_trace = SimTrace(**msg.data)
            await self.process_sim_trace(worker.sim_conf, sim_trace)
        elif msg.message == "simStatus":

            sim_status = SimStatus(**msg.data)

            await self.process_sim_status(
                worker.sim_conf.userId, worker.sim_conf.simId, sim_status.status, sim_status.dict()
            )

        elif msg.message == "simLog":
            sim_log = SimLog(**msg.data)

            log = {
                "log": sim_log.log,
                "userId": worker.sim_conf.userId,
                "simId": worker.sim_conf.id,
            }

            await self.db.create_sim_log(log)

        elif msg.message == "simLogMessage":
            sim_log_msg = SimLogMessage(**msg.data)
            await self.send_message(
                worker.sim_conf.userId,
                "simLogMessage",
                {**sim_log_msg.dict(), "simId": worker.sim_conf.id},
            )
        elif msg.message == "simSpatialStepTrace":
            trace = SimSpatialStepTrace(**msg.data)

            await self.process_sim_spatial_step_trace(worker.sim_conf, trace)
        elif msg.message == "tmp_sim_log":
            sim_log = SimLog(**msg.data)

            tmp_sim_log = {
                "log": sim_log.log,
                "userId": worker.sim_conf.userId,
                "simId": worker.sim_conf.id,
            }
            await self.send_message(worker.sim_conf.userId, "tmp_sim_log", tmp_sim_log, cmdid=msg.cmdid)

    async def schedule_sim(self, sim_conf: SimConfig) -> None:
        L.debug("scheduling a simulation")
        self.sim_conf_queue.append(sim_conf)

        with open(f"/data/traces/{sim_conf.id}.json", "a") as file:
            file.write("[]")

        spatial_sampling = sim_conf.solverConf.get("spatialSampling")

        if spatial_sampling and spatial_sampling["enabled"]:
            with open(f"/data/spatial-traces/{sim_conf.id}.json", "a") as file:
                file.write("[]")

        await self.process_sim_status(sim_conf.userId, sim_conf.id, "queued")
        await self.run_available()

    @property
    def running_sim_ids(self) -> List[str]:
        return [worker.sim_conf.id for worker in self.workers if worker.sim_conf is not None]

    async def request_tmp_sim_log(self, sim_id, cmdid):
        worker = next(
            (worker for worker in self.workers if worker.sim_conf is not None and worker.sim_conf.id == sim_id),
            None,
        )

        if worker:
            await worker.ws.send_message("get_tmp_sim_log", cmdid=cmdid)

    async def request_tmp_sim_trace(self, sim_id, cmdid):
        worker = next(
            (worker for worker in self.workers if worker.sim_conf is not None and worker.sim_conf.id == sim_id),
            None,
        )

        if worker:
            await worker.ws.send_message("get_tmp_sim_trace", cmdid=cmdid)

    async def cancel_sim(self, sim: SimId):
        queue_idx = next(
            (index for (index, sim_conf) in enumerate(self.sim_conf_queue) if sim_conf.id == sim.id),
            None,
        )

        await self.process_sim_status(sim.userId, sim.id, "cancelled")

        if queue_idx is not None:
            L.debug(f"sim to cancel is in queue, id: {queue_idx}")
            self.sim_conf_queue.pop(queue_idx)
            return

        worker = next(
            (worker for worker in self.workers if worker.sim_conf is not None and worker.sim_conf.id == sim.id),
            None,
        )

        if not worker:
            L.debug("sim to cancel is not in the queue")
            return

        L.debug("sending message to worker to cancel the sim")
        await worker.ws.send_message("cancel_sim")  # type: ignore

    async def process_sim_status(self, user_id: str, sim_id: str, status: SimStatusLiteral, context={}) -> None:
        await self.db.update_simulation(
            UpdateSimulation(**{**context, "id": sim_id, "userId": user_id, "status": status})
        )
        await self.send_sim_status(user_id, sim_id, status, context=context)

    async def process_sim_progress(self, sim_conf: SimConfig, progress: float, context={}) -> None:
        user_id = sim_conf.userId
        sim_id = sim_conf.id
        await self.db.update_simulation(
            UpdateSimulation(**{**context, "id": sim_id, "userId": user_id, "progress": progress})
        )

        await self.send_message(user_id, "simProgress", {**context, "simId": sim_id, "progress": progress})

    async def process_sim_spatial_step_trace(
        self, sim_conf: SimConfig, spatial_step_trace: SimSpatialStepTrace
    ) -> None:
        user_id = sim_conf.userId

        trace = spatial_step_trace.dict()

        await self.db.create_sim_spatial_step_trace({**trace, "userId": user_id, "simId": sim_conf.id})

        with open(f"/data/spatial-traces/{sim_conf.id}.json", "a") as file:
            file.seek(0, os.SEEK_END)
            file.seek(file.tell() - 1, os.SEEK_SET)
            file.truncate()

            lead_char = ", " if trace["stepIdx"] > 0 else ""
            trace_str = json.dumps({**trace, "simId": sim_conf.id})

            file.write(f"{lead_char}{trace_str}]")

        await self.send_message(
            user_id,
            "simSpatialStepTrace",
            {**trace, "simId": sim_conf.id},
        )

    async def process_sim_trace(self, sim_conf: SimConfig, sim_trace: SimTrace) -> None:
        user_id = sim_conf.userId
        sim_id = sim_conf.id

        trace = sim_trace.dict()

        if not sim_trace.stream:
            with open(f"/data/traces/{sim_conf.id}.json", "a") as file:
                file.seek(0, os.SEEK_END)
                file.seek(file.tell() - 1, os.SEEK_SET)
                file.truncate()

                lead_char = ", " if trace["index"] > 0 else ""
                trace_str = json.dumps({**trace, "simId": sim_conf.id})

                file.write(f"{lead_char}{trace_str}]")

        if sim_trace.persist:
            await self.db.create_sim_trace(
                {
                    **trace,
                    "simId": sim_id,
                    "userId": user_id,
                }
            )

        status_message = {"simId": sim_id, "userId": user_id, "status": "finished"}

        status_message.update(sim_trace.dict())
        if sim_trace.stream:
            await self.send_message(user_id, "simTrace", status_message)

    async def send_sim_status(self, user_id: str, sim_id: str, status: SimStatusLiteral, context={}) -> None:
        await self.send_message(
            user_id,
            "simStatus",
            {**context, "simId": sim_id, "status": status},
        )

    async def send_message(self, user_id: str, name: str, message: Any, cmdid=None):
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
        await worker.ws.send_message("run_sim", worker.sim_conf.dict(exclude_none=True))

        await self.run_available()
