
import os
import time
import json
import uuid

import tornado.ioloop
import tornado.websocket
import tornado.web

from .utils import ExtendedJSONEncoder
from .sim_manager import SimManager, SimWorker
from .db import Db
from .geometry import Geometry
from .model_export import get_exported_model
from .model_import import from_sbml
from .logger import get_logger


L = get_logger(__name__)

db = Db()
sim_manager = SimManager(db)


SEC_SHORT_TYPE_DICT = {
    'soma': 'soma',
    'basal_dendrite': 'dend',
    'apical_dendrite': 'apic',
    'axon': 'axon'
}


class WSHandler(tornado.websocket.WebSocketHandler):
    closed = False

    def open(self):
        self.user_id = self.get_query_argument('userId', default=None)
        L.debug('ws client has been connected')
        if self.user_id is None:
            L.debug('closing ws connection without user_id param')
            self.close(reason="No user_id query param found")
            return
        sim_manager.add_client(self.user_id, self)

    def check_origin(self, origin):
        return True

    @tornado.web.asynchronous
    def on_message(self, msg):
        msg = json.loads(msg)
        cmd = msg['cmd']
        cmdid = msg['cmdid']
        L.debug('got {} message'.format(cmd))

        if cmd == 'run_simulation':
            sim_conf = msg['data']
            sim_manager.schedule_sim(sim_conf)

        if cmd == 'cancel_simulation':
            sim_conf = msg['data']
            sim_manager.cancel_sim(sim_conf)

        if cmd == 'create_simulation':
            db.create_simulation(msg['data'])

        if cmd == 'update_simulation':
            db.update_simulation(msg['data'])

        if cmd == 'delete_simulation':
            db.delete_simulation(msg['data'])

        if cmd == 'get_simulations':
            model_id = msg['data']['modelId']
            simulations = db.get_simulations(self.user_id, model_id)
            self.send_message('simulations', {
                'cmdid': cmdid,
                'simulations': simulations
            })

        if cmd == 'create_geometry':
            geometry_config = msg['data']
            geometry = Geometry(geometry_config)
            structure_size_dict = {st['name']:st['size'] for st in geometry.structures}
            self.send_message('geometry', {
                'cmdid': cmdid,
                'id': geometry.id,
                'structureSize': structure_size_dict
            })

        if cmd == 'get_exported_model':
            model_format = msg['data']['format']
            model_dict = msg['data']['model']
            model_str = None
            error_msg = None
            try:
                model_str = get_exported_model(model_dict, model_format)
            except Exception as error:
                error_msg = error.message
            self.send_message('exported_model', {
                'cmdid': cmdid,
                'fileContent': model_str,
                'error': error_msg
            })

        if cmd == 'convert_from_sbml':
            sbml_str = msg['data']['sbml']
            self.send_message('from_sbml', {
                **from_sbml(sbml_str),
                'cmdid': cmdid,
            })

        if cmd == 'query_molecular_repo':
            query = msg['data']
            result = db.query_molecular_repo(query)
            self.send_message('query_result', {
                'cmdid': cmdid,
                'queryResult': result
            })

        if cmd == 'query_branch_names':
            search_str = msg['data'] if 'data' in msg else ''
            branch_names = db.query_branch_names(search_str)
            self.send_message('branch_names', {
                'cmdid': cmdid,
                'branches': branch_names
            })

        if cmd == 'get_user_branches':
            branches = db.get_user_branches(self.user_id)
            self.send_message('user_branches', {
                'cmdid': cmdid,
                'userBranches': branches
            })

        if cmd == 'query_revisions':
            branch_name = msg['data']
            revisions = db.query_revisions(branch_name)
            self.send_message('revisions', {
                'cmdid': cmdid,
                'revisions': revisions
            })

        if cmd == 'save_revision':
            revision_data = msg['data'];
            revision_meta = db.save_revision(revision_data, self.user_id)
            self.send_message('save_revision', {
                **revision_meta,
                'cmdid': cmdid,
            })

        if cmd == 'get_revision':
            branch = msg['data']['branch']
            revision = msg['data']['revision']
            revision_data = db.get_revision(branch, revision)
            self.send_message('revision_data', {
                'cmdid': cmdid,
                'revision': revision_data
            })

        if cmd == 'get_branch_latest_rev':
            branch = msg['data']
            branch_latest_rev = db.get_branch_latest_rev(branch)
            self.send_message('branch_latest_rev', {
                'cmdid': cmdid,
                'rev': branch_latest_rev
            })

    def on_close(self):
        self.closed = True
        if self.user_id is not None:
            sim_manager.remove_client(self.user_id, self)
        L.debug('client disconnected')

    def send_message(self, cmd, data=None):
        if not self.closed:
            payload = json.dumps({'cmd': cmd, 'data': data},
                                 cls=ExtendedJSONEncoder)
            self.write_message(payload)


class SimRunnerWSHandler(tornado.websocket.WebSocketHandler):
    closed = False
    sim_worker = None

    def check_origin(self, origin):
        L.debug('sim runner websocket client has been connected')
        return True

    def open(self):
        self.sim_worker = SimWorker(self)
        sim_manager.add_worker(self.sim_worker)

    @tornado.web.asynchronous
    def on_message(self, rawMessage):
        parsedMessage = json.loads(rawMessage)
        msg = parsedMessage['message']
        data = parsedMessage['data']
        L.debug('got {} message from sim runner'.format(msg))

        sim_manager.process_worker_message(self.sim_worker, msg, data)

    def on_close(self):
        self.closed = True
        sim_manager.remove_worker(self.sim_worker)

    def send_message(self, cmd, data=None):
        if not self.closed:
            payload = json.dumps({'cmd': cmd, 'data': data},
                                 cls=ExtendedJSONEncoder)
            self.write_message(payload)


class HealthHandler(tornado.web.RequestHandler):
    def get(self):
        self.write('ok')


app = tornado.web.Application([
    (r'/ws', WSHandler),
    (r'/sim', SimRunnerWSHandler),
    (r'/health', HealthHandler)
],
    debug=os.getenv('DEBUG', False),
    websocket_max_message_size=20000000
)

L.debug('starting tornado io loop')
app.listen(8000)
tornado.ioloop.IOLoop.current().start()
