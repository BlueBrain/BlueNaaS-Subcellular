
import os
import logging
import time
import json

import bluepy
import tornado.ioloop
import tornado.websocket
import tornado.web

from tornado.log import enable_pretty_logging
from bluepy.v2.enums import Synapse

from subcellular_experiment.utils import NumpyAwareJSONEncoder


enable_pretty_logging()
L = logging.getLogger(__name__)
L.setLevel(logging.DEBUG if os.getenv('DEBUG', False) else logging.INFO)

CIRCUIT_PATH = os.environ['CIRCUIT_PATH']
while not os.path.isfile(CIRCUIT_PATH):
    L.warning('circuit config is not found (not uploaded yet / wrong path)')
    L.info('waiting while circuit config will become available')
    time.sleep(60)

L.debug('creating bluepy circuit from %s', CIRCUIT_PATH)
CIRCUIT = bluepy.Circuit(CIRCUIT_PATH)
L.debug('bluepy circuit has been created')
CELLS = CIRCUIT.v2.cells.get().drop(['orientation', 'synapse_class'], 1, errors='ignore')

SEC_SHORT_TYPE_DICT = {
    'soma': 'soma',
    'basal_dendrite': 'dend',
    'apical_dendrite': 'apic',
    'axon': 'axon'
}


class WSHandler(tornado.websocket.WebSocketHandler):
    closed = False

    def check_origin(self, origin):
        L.debug('websocket client has been connected')
        return True

    @tornado.web.asynchronous
    def on_message(self, msg):
        msg = json.loads(msg)
        L.debug('got ws message: %s', msg)
        cmd = msg['cmd']
        cmdid = msg['cmdid']

        if cmd == 'get_circuit_info':
            L.debug('sending circuit cell properties to the client')
            circuit_info = {
                'properties': CELLS.columns.tolist(),
                'count': len(CELLS),
                'cmdid': cmdid
            }
            self.send_message('circuit_info', circuit_info)

        if cmd == 'get_circuit_cells':
            cell_count = len(CELLS)

            def generate_cell_chunks():
                current_index = 0
                chunk_size = int(cell_count / 100)
                while current_index < cell_count:
                    cell_data_chunk = CELLS[current_index : current_index + chunk_size]

                    L.debug('cell data chunk for cells %s:%s is ready to be sent',
                             current_index,
                             current_index + chunk_size)

                    yield cell_data_chunk
                    current_index = current_index + chunk_size

            cell_chunks_it = generate_cell_chunks()

            def send():
                try:
                    cell_chunk = next(cell_chunks_it)
                except StopIteration:
                    cell_chunk = None
                if cell_chunk is not None:
                    self.send_message('circuit_cells', cell_chunk.values)
                    tornado.ioloop.IOLoop.current().add_callback(send)

            tornado.ioloop.IOLoop.current().add_callback(send)

        if cmd == 'get_cell_morphology':
            gids = msg['data']
            L.debug('getting cell morph for %s', gids)
            cells = {}
            for gid in gids:
                cell = CIRCUIT.v2.morph.get(gid, transform=True)
                morphology = [
                    {
                        'points': [point[:4] for point in section.points],
                        'id': section.id,
                        'type': SEC_SHORT_TYPE_DICT[section.type.name]
                    }
                    for section in cell.sections]


                orientation = CIRCUIT.v2.cells.get(gid)['orientation']

                cells[gid] = {
                    'sections': morphology,
                    'orientation': orientation
                }
            L.debug('getting cell morph for %s done', gids)
            self.send_message('cell_morphology', {
                'cells': cells,
                'cmdid': cmdid
            })

        if cmd == 'get_syn_connections':
            gid = msg['data']

            L.debug('getting syn connections for %s', gid)

            props = [
                Synapse.POST_X_CENTER,
                Synapse.POST_Y_CENTER,
                Synapse.POST_Z_CENTER,
                Synapse.TYPE,
                Synapse.PRE_GID,
                Synapse.PRE_SECTION_ID,
                Synapse.POST_GID,
                Synapse.POST_SECTION_ID,
                Synapse.POST_NEURITE_DISTANCE,
                Synapse.POST_SECTION_DISTANCE,
                Synapse.AXONAL_DELAY,
                Synapse.D_SYN,
                Synapse.DTC,
                Synapse.F_SYN,
                Synapse.G_SYNX,
                Synapse.NRRP,
                Synapse.U_SYN,
                Synapse.TOUCH_DISTANCE
            ]

            props_str = [
                'postXCenter',
                'postYCenter',
                'postZCenter',
                'type',
                'preGid',
                'preSectionGid',
                'postGid',
                'postSectionId',
                'postNeuriteDistance',
                'postSectionDistance',
                'axonalDelay',
                'dSyn',
                'dtc',
                'fSyn',
                'gSynx',
                'nrrp',
                'uSyn',
                'touchDistance'
            ]

            L.debug('getting afferent synapses for %s', gid)
            synapses = CIRCUIT.v2.connectome.afferent_synapses(gid, properties=props).values.tolist()

            L.debug('getting syn connections for %s done', gid)

            self.send_message('syn_connections', {
                'synapses': synapses,
                'synapse_properties': props_str,
                'cmdid': cmdid

            })

    def on_close(self):
        self.closed = True

    def send_message(self, cmd, data=None):
        if not self.closed:
            payload = json.dumps({'cmd': cmd, 'data': data},
                                 cls=NumpyAwareJSONEncoder)
            self.write_message(payload)


if __name__ == '__main__':
    app = tornado.web.Application([
        (r'/ws', WSHandler),
    ])
    L.debug('starting tornado io loop')
    app.listen(8000)
    tornado.ioloop.IOLoop.current().start()
