# pylint: disable-all
import os
import re
import subprocess
import json
import networkx as nx
from networkx.readwrite import json_graph
import pysb.bng
from pysb.tools import render_reactions
from pysb.importers import bngl
import pygraphviz

from .gmltojson import gmltojson
from .model_to_bngl import model_to_bngl
from .utils import tempdir
from .settings import BNG_PATH


@tempdir()
def contact_map(model: dict):
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

    with open(f"{model['id']}_viz_contactmap.gml", "r") as gmlsrc:
        return gmltojson(gmlsrc.read())


@tempdir()
def reactivity_network(model: dict):
    bngl_str = model_to_bngl(model)

    with open(f"{model['id']}.bngl", "w") as model_file:
        model_file.write(bngl_str)

    pysb_model = bngl.model_from_bngl(f"{model['id']}.bngl")
    pysb.bng.generate_equations(pysb_model)

    graph: dict = {"nodes": [], "edges": []}

    ic_species = [ic.pattern for ic in pysb_model.initials]
    for i, cp in enumerate(pysb_model.species):
        label = str(cp)[:20]
        species_node = "s%d" % i
        color = "#ccffcc"
        # color species with an initial condition differently
        if len([s for s in ic_species if s.is_equivalent_to(cp)]):
            color = "#aaffff"
        graph["nodes"].append(
            {"id": species_node, "label": label, "type": "rect", "style": {"fill": color}}
        )

    for i, reaction in enumerate(pysb_model.reactions_bidirectional):
        reaction_node = "r%d" % i

        graph["nodes"].append(
            {
                "id": reaction_node,
                "label": reaction_node,
                "shape": "circle",
                "style": {"fill": "lightgray"},
            }
        )

        reactants = set(reaction["reactants"])
        products = set(reaction["products"])
        modifiers = reactants & products
        reactants = reactants - modifiers
        products = products - modifiers

        attr_reversible = {"dir": "both", "arrowtail": "empty"} if reaction["reversible"] else {}
        for s in reactants:
            graph["edges"].append(
                {
                    "source": f"s{s}",
                    "target": f"r{i}",
                    "style": {"startArrow": bool(reaction["reversible"]), "endArrow": True},
                }
            )

        for s in products:
            graph["edges"].append(
                {
                    "target": f"s{s}",
                    "source": f"r{i}",
                    "style": {"startArrow": bool(reaction["reversible"]), "endArrow": True},
                }
            )

        for s in modifiers:
            graph["edges"].append(
                {
                    "source": f"s{s}",
                    "target": f"r{i}",
                    "style": {"endArrow": "diamond"},
                }
            )

    return graph
