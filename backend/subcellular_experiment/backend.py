import os
import json
import asyncio
from types import FrameType
import signal

import tornado.ioloop
import tornado.websocket
import tornado.web
import sentry_sdk
from sentry_sdk.integrations.tornado import TornadoIntegration

from .utils import ExtendedJSONEncoder
from .sim_manager import SimManager, SimWorker
from .db import Db
from .geometry import Geometry
from .model_export import get_exported_model
from .model_import import from_sbml, revision_from_excel
from .logger import get_logger
from .envvars import SENTRY_DSN
from .types import SimConfig

if SENTRY_DSN is not None:
    sentry_sdk.init(
        dsn="https://252f85f1037f47bea93b31981043dd4c@o224246.ingest.sentry.io/5561238",
        integrations=[TornadoIntegration()],
    )


L = get_logger(__name__)

db = Db()
sim_manager = SimManager(db)


SEC_SHORT_TYPE_DICT = {
    "soma": "soma",
    "basal_dendrite": "dend",
    "apical_dendrite": "apic",
    "axon": "axon",
}


class WSHandler(tornado.websocket.WebSocketHandler):
    closed = False

    def open(self):
        self.user_id = self.get_query_argument("userId", default=None)
        L.debug("ws client has been connected")
        if self.user_id is None:
            L.debug("closing ws connection without user_id param")
            self.close(reason="No user_id query param found")
            return
        sim_manager.add_client(self.user_id, self)

    def check_origin(self, origin):  # pylint: disable=unused-argument
        return True

    async def on_message(self, msg):  # pylint: disable=invalid-overridden-method
        msg = json.loads(msg)
        cmd = msg["cmd"]
        cmdid = msg["cmdid"]
        L.debug("got {} message".format(cmd))

        if cmd == "run_simulation":
            sim_conf = SimConfig(**msg["data"])
            await sim_manager.schedule_sim(sim_conf)

        if cmd == "get_log":
            sim_id = msg["data"]
            if sim_id in sim_manager.running_sim_ids:
                await sim_manager.request_tmp_sim_log(sim_id, cmdid)
            else:
                sim_log = await db.get_sim_log(sim_id)
                await self.send_message("log", sim_log, cmdid=cmdid)

        if cmd == "get_trace":
            sim_id = msg["data"]
            if sim_id in sim_manager.running_sim_ids:
                await sim_manager.request_tmp_sim_trace(sim_id, cmdid)
            else:
                traces = db.db.simTraces.find({"simId": sim_id})
                async for trace in traces:
                    await self.send_message("simTrace", trace)

        if cmd == "cancel_simulation":
            sim_conf = msg["data"]
            await sim_manager.cancel_sim(sim_conf)

        if cmd == "create_simulation":
            await db.create_simulation(msg["data"])

        if cmd == "update_simulation":
            await db.update_simulation(msg["data"])

        if cmd == "delete_simulation":
            sim = msg["data"]
            await sim_manager.cancel_sim(sim)
            await db.delete_simulation(sim)
            await db.delete_sim_spatial_traces(sim)
            await db.delete_sim_trace(sim)
            await db.delete_sim_log(sim)

        if cmd == "get_simulations":
            model_id = msg["data"]["modelId"]
            simulations = await db.get_simulations(self.user_id, model_id)
            await self.send_message("simulations", {"simulations": simulations}, cmdid=cmdid)

        if cmd == "create_geometry":
            geometry_config = msg["data"]
            geometry = Geometry(geometry_config)
            structure_size_dict = {st["name"]: st["size"] for st in geometry.structures}
            L.debug(f"new geometry {str(geometry.id)} has been created")
            await self.send_message(
                "geometry", {"id": geometry.id, "structureSize": structure_size_dict}, cmdid=cmdid
            )

        if cmd == "get_exported_model":
            model_format = msg["data"]["format"]
            model_dict = msg["data"]["model"]
            model_str = None
            error_msg = None
            try:
                model_str = get_exported_model(model_dict, model_format)
            except Exception as error:
                await self.send_message(
                    "exported_model", {"fileContent": model_str, "error": str(error)}, cmdid=cmdid
                )

        if cmd == "convert_from_sbml":
            sbml_str = msg["data"]["sbml"]
            await self.send_message("from_sbml", from_sbml(sbml_str), cmdid=cmdid)

        if cmd == "revision_from_excel":
            await self.send_message(
                "revision_from_excel", revision_from_excel(msg["data"]), cmdid=cmdid
            )

        if cmd == "query_molecular_repo":
            query = msg["data"]
            result = await db.query_molecular_repo(query)
            await self.send_message("query_result", {"queryResult": result}, cmdid=cmdid)

        if cmd == "query_branch_names":
            search_str = msg["data"] if "data" in msg else ""
            branch_names = await db.query_branch_names(search_str)
            await self.send_message("branch_names", {"branches": branch_names}, cmdid=cmdid)

        if cmd == "get_user_branches":
            branches = await db.get_user_branches(self.user_id)
            await self.send_message("user_branches", {"userBranches": branches}, cmdid=cmdid)

        if cmd == "query_revisions":
            branch_name = msg["data"]
            revisions = await db.query_revisions(branch_name)
            await self.send_message("revisions", {"revisions": revisions}, cmdid=cmdid)

        if cmd == "save_revision":
            revision_data = msg["data"]
            revision_meta = await db.save_revision(revision_data, self.user_id)
            await self.send_message("save_revision", revision_meta, cmdid=cmdid)

        if cmd == "get_revision":
            branch = msg["data"]["branch"]
            revision = msg["data"]["revision"]
            revision_data = await db.get_revision(branch, revision)
            await self.send_message("revision_data", {"revision": revision_data}, cmdid=cmdid)

        if cmd == "get_branch_latest_rev":
            branch = msg["data"]
            branch_latest_rev = await db.get_branch_latest_rev(branch)
            await self.send_message("branch_latest_rev", {"rev": branch_latest_rev}, cmdid=cmdid)

        if cmd == "get_spatial_step_trace":
            sim_id = msg["data"]["simId"]
            step_idx = msg["data"]["stepIdx"]
            spatial_step_trace = await db.get_spatial_step_trace(sim_id, step_idx)
            await self.send_message("spatial_step_trace", spatial_step_trace, cmdid=cmdid)

        if cmd == "get_last_spatial_step_trace_idx":
            sim_id = msg["data"]["simId"]
            step_idx = await db.get_last_spatial_step_trace_idx(sim_id)
            await self.send_message("last_spatial_step_trace_idx", step_idx, cmdid=cmdid)

    def on_close(self):
        self.closed = True
        if self.user_id is not None:
            sim_manager.remove_client(self.user_id, self)
        L.debug("client connection has been closed")

    async def send_message(self, cmd, data=None, cmdid=None):
        if self.closed:
            return

        payload = json.dumps({"cmd": cmd, "cmdid": cmdid, "data": data}, cls=ExtendedJSONEncoder)

        try:
            await self.write_message(payload)
        except Exception as e:
            L.error(e.args)


class SimRunnerWSHandler(tornado.websocket.WebSocketHandler):
    closed = False
    sim_worker = None

    def check_origin(self, origin):  # pylint: disable=unused-argument
        L.debug("sim runner websocket client has been connected")
        return True

    def open(self):
        self.sim_worker = SimWorker(self)
        sim_manager.add_worker(self.sim_worker)

    async def on_message(self, rawMessage):  # pylint: disable=invalid-overridden-method
        parsedMessage = json.loads(rawMessage)
        msg = parsedMessage["message"]
        data = parsedMessage["data"]
        cmdid = parsedMessage["cmdid"]

        await sim_manager.process_worker_message(self.sim_worker, msg, data, cmdid=cmdid)

    def on_close(self):
        L.info("sim worker connection has been closed")
        self.closed = True

        async def wrapper():
            await sim_manager.remove_worker(self.sim_worker)

        asyncio.create_task(wrapper())

    async def send_message(self, cmd, data=None, cmdid=None):
        if self.closed:
            return
        payload = json.dumps({"cmd": cmd, "cmdid": cmdid, "data": data}, cls=ExtendedJSONEncoder)

        try:
            await self.write_message(payload)
        except Exception as e:
            L.error(e.args)


class HealthHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("ok")


def on_terminate(signum: int, frame: FrameType):  # pylint: disable=unused-argument
    L.debug("received shutdown signal")
    tornado.ioloop.IOLoop.current().stop()


signal.signal(signal.SIGINT, on_terminate)
signal.signal(signal.SIGTERM, on_terminate)


app = tornado.web.Application(
    [(r"/ws", WSHandler), (r"/sim", SimRunnerWSHandler), (r"/health", HealthHandler)],
    debug=os.getenv("DEBUG", None) or False,
    websocket_max_message_size=100 * 1024 * 1024,
    ping_interval=30,
    ping_timeout=10,
)

L.debug("starting tornado io loop")
app.listen(8000)

loop = tornado.ioloop.IOLoop.current()
loop.run_sync(db.create_indexes)
loop.start()
