
import os
import json


import steps.utilities.meshio as meshio
import numpy as np

from .bngl_extended_model import StructureType
from .logger import get_logger


L = get_logger(__name__)

GEOMETRY_ROOT_PATH = '/data/geometries'
TETGEN_TYPE_EXTENSION = {
    'nodes': 'node',
    'faces': 'face',
    'elements': 'ele'
}

if not os.path.exists(GEOMETRY_ROOT_PATH):
    umask = os.umask(0)
    os.makedirs(GEOMETRY_ROOT_PATH, 0o777)
    os.umask(umask)

class Geometry():
    def __init__(self, geometry_config):
        self.id = geometry_config['id']
        self.name = geometry_config['name']
        self.annotation = geometry_config['annotation']
        self.scale = geometry_config['scale']
        self.structures = geometry_config['structures']
        self.free_diffusion_boundaries = geometry_config['freeDiffusionBoundaries']
        self.mesh_name_root = geometry_config['meshNameRoot']

        geometry_path = os.path.join(GEOMETRY_ROOT_PATH, self.id)
        os.makedirs(geometry_path)
        os.chdir(geometry_path)
        for tetgen_type in TETGEN_TYPE_EXTENSION:
            filename = '{}.{}'.format(self.mesh_name_root, TETGEN_TYPE_EXTENSION[tetgen_type])
            with open(filename, 'w') as file:
                file.write(geometry_config['file'][tetgen_type])

        mesh = meshio.importTetGen(self.mesh_name_root, geometry_config['scale'])[0]
        meshio.saveMesh(os.path.join(geometry_path, 'mesh'), mesh)

        with open('geometry.json', 'w') as file:
            file.write(json.dumps(geometry_config))

        self.nodes = [mesh.getVertex(idx) for idx in range(0, mesh.nverts)]
        self.faces = [mesh.getTri(idx) for idx in range(0, mesh.ntris)]
        self.elements = [mesh.getTet(idx) for idx in range(0, mesh.ntets)]

        idx_map = {
            StructureType.COMPARTMENT: 'tetIdxs',
            StructureType.MEMBRANE: 'triIdxs'
        }

        for structure in self.structures:
            idxs = np.array(structure[idx_map[structure['type']]], dtype=np.uintc)
            sizes = np.zeros(len(idxs), dtype=np.float64)
            if structure['type'] == StructureType.COMPARTMENT:
                mesh.getBatchTetVolsNP(idxs, sizes)
            else:
                mesh.getBatchTriAreasNP(idxs, sizes)

            structure['size'] = sizes.sum()

    def to_dict(self):
        geometry_dict = {
            'id': self.id,
            'name': self.name,
            'annotation': self.annotation,
            'nodes': self.nodes,
            'faces': self.faces,
            'elements': self.elements,
            'scale': self.scale,
            'structures': self.structures,
            'freeDiffusionBoundaries': self.free_diffusion_boundaries,
            'meshNameRoot': self.mesh_name_root
        }

        return geometry_dict
