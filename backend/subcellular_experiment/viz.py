# pylint: disable-all
import subprocess
import json
import networkx as nx
from networkx.readwrite import json_graph


from .model_to_bngl import model_to_bngl
from .utils import tempdir
from .settings import BNG_PATH


@tempdir()
def visualize(model: dict):
    bngl = f"""{model_to_bngl(model)}
    visualize({{type=>"contactmap"}})"""

    fname = f'{model["id"]}_viz.bngl'

    with open(fname, "w") as file:
        file.write(bngl)

    subprocess.run(
        [BNG_PATH, fname],
        check=False,
        capture_output=True,
    )

    contactmap = nx.read_gml(f"{model['id']}_viz_contactmap.gml")
