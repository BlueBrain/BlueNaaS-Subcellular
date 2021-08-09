from typing import List, Any
import re


def parse_graph(graph_def: List[Any]):
    graph = {}

    for i in range(0, len(graph_def), 2):
        key, value = graph_def[i : i + 2]
        graph[key] = str(value) if not isinstance(value, list) else parse_graph(value)
    return graph


def parse_section(definition: List[Any]):
    """Generates graph for given entitiy (i.e. nodes or edges)"""
    entities = []

    for i in range(0, len(definition), 2):
        _, value = definition[i : i + 2]
        entities.append((value if not isinstance(value, list) else parse_graph(value)))

    return entities


def gmltojson(gml: str):
    gml = re.sub(r"\s+", " ", gml)
    gml = gml[6:-1]

    parts = []

    for char in gml.split():
        match = re.match("^[a-zA-Z]+$", char)
        parts.append(char if match is None else f'"{match.group(0)}"')

    gml = ",".join(parts)
    gml = gml.replace("[,", "[")
    gml = gml.replace(",]", "]")

    nodes_idx = gml.find('"node"')
    edges_idx = gml.find('"edge"')

    # pylint: disable=eval-used

    config = eval(f"{gml[0:nodes_idx]}]")
    nodes = eval(f"[{gml[nodes_idx:edges_idx]}]")
    edges = eval(f"[{gml[edges_idx:]}")
    # pyline: enable=eval=used

    return {"nodes": parse_section(nodes), "edges": parse_section(edges), **parse_graph(config)}
