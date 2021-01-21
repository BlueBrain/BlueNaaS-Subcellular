import os
import json
from typing import Dict

import steps.utilities.meshio as meshio
import numpy as np

from .logger import get_logger


L = get_logger(__name__)

GEOMETRY_ROOT_PATH = "/data/geometries"
TETGEN_TYPE_EXTENSION = {"nodes": "node", "faces": "face", "elements": "ele"}

if not os.path.exists(GEOMETRY_ROOT_PATH):
    umask = os.umask(0)
    os.makedirs(GEOMETRY_ROOT_PATH, 0o777)
    os.umask(umask)


def create_geometry(id_: str, geometry_config: dict) -> Dict[str, float]:
    meta = geometry_config["meta"]
    mesh_name_root = meta["meshNameRoot"]

    geometry_path = os.path.join(GEOMETRY_ROOT_PATH, id_)
    os.makedirs(geometry_path)
    os.chdir(geometry_path)
    for tetgen_type, extension in TETGEN_TYPE_EXTENSION.items():
        filename = f"{mesh_name_root}.{extension}"
        with open(filename, "w") as file:
            file.write(geometry_config["mesh"]["volume"]["raw"][tetgen_type])

    mesh = meshio.importTetGen(mesh_name_root, meta["scale"])[0]
    meshio.saveMesh(os.path.join(geometry_path, "mesh"), mesh)

    with open("geometry.json", "w") as file:
        file.write(json.dumps(meta))

    idx_map = {"compartment": "tetIdxs", "membrane": "triIdxs"}

    structure_sizes = {}

    for structure in meta["structures"]:
        idxs = np.array(structure[idx_map[structure["type"]]], dtype=np.uintc)
        sizes = np.zeros(len(idxs), dtype=np.float64)
        if structure["type"] == "compartment":
            mesh.getBatchTetVolsNP(idxs, sizes)
        else:
            mesh.getBatchTriAreasNP(idxs, sizes)

        structure["size"] = sizes.sum()
        structure_sizes[structure["name"]] = sizes.sum()

    return structure_sizes
