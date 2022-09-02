from typing import List
from typing_extensions import Literal

NA = 6.02214086e23


DIFF_PREFIX = "___int_sys_diff___"
STIM_PREFIX = "___int_sys_stim___"
SPAT_PREFIX = "___int_sys_spat___"

Entity = Literal[
    "parameter",
    "function",
    "structure",
    "molecule",
    "observable",
    "diffusion",
    "species",
    "reaction",
]

ENTITY_TYPES: List[Entity] = [
    "parameter",
    "structure",
    "molecule",
    "species",
    "observable",
    "function",
    "reaction",
]


def model_to_bngl(
    model: dict,
    write_xml_op=False,
    artificial_structures=False,
    add_diff_observables=False,
) -> str:

    bngl_lines: List[str] = []

    bngl_lines.append("begin model\n")

    for entity_type in ENTITY_TYPES:

        section_name = entity_section_name(entity_type)

        entity_key = f"{entity_type}{'s' if entity_type != 'species' else ''}"

        if len(model[entity_key]) == 0:
            continue

        bngl_lines.append(f"begin {section_name}")

        if entity_type == "structure" and artificial_structures:
            entities = generate_artificial_structures(model["structures"])
        else:
            entities = model[entity_key]

        for entity in entities:
            entity_str = entity_to_str(entity_type, entity)
            bngl_lines.append(entity_str)
        if entity_type == "observable" and add_diff_observables:
            for diffusion in model["diffusions"]:
                bngl_lines.append(entity_to_str("diffusion", diffusion))
        bngl_lines.append(f"end {section_name}\n")

    bngl_lines.append("end model")
    if write_xml_op:
        bngl_lines.append('writeXML({prefix=>"model"})')

    return "\n".join(bngl_lines) + "\n"


def entity_section_name(entity: Entity):
    name: str = entity
    if entity == "structure":
        name = "compartment"

    if entity == "molecule":
        name = "molecule type"

    if entity == "reaction":
        name = "reaction rule"

    return f"{name}{'s' if name != 'species' else ''}"


def entity_to_str(entity_type: Entity, entity: dict) -> str:
    if entity_type == "parameter":
        return f"  {entity['name']} {entity['definition']}"

    if entity_type == "function":
        return f"  {entity['name']}({entity.get('argument', '')}) = {entity['definition']}"

    if entity_type == "structure":
        dimensions = 3 if entity["type"] == "compartment" else 2
        parent_name = entity.get("parentName", "")
        if parent_name == "-":
            parent_name = ""
        return f"  {entity['name']} {dimensions} {entity['size']} {parent_name}"

    if entity_type == "molecule":
        return f"  {entity['definition']}"

    if entity_type == "observable":
        return f"  Molecules {entity['name']} {entity['definition']}"

    if entity_type == "diffusion":
        return f"  Molecules {DIFF_PREFIX}{entity['name']} {entity['species_definition']}@{entity['compartment']}"

    if entity_type == "species":
        return f"  {entity['definition']} {entity['concentration']}"

    if entity_type == "reaction":
        return reaction_to_str(entity)

    return ""


def reaction_to_str(reac: dict) -> str:
    name = reac["name"]

    if name == "-":
        name = ""

    return (
        f"  {name}{': ' if name else ''}{reac['definition']} {reac['kf']}"
        + (f", {reac['kr']}" if "<->" in reac["definition"] and "rate_f" not in reac["kf"] else "")
        + (" TotalRate" if "rate_f" in reac["kf"] else "")
    )


def generate_artificial_structures(real_structures: dict) -> List[dict]:
    root_structure_name = "ext_comp___"
    structures = [
        {
            "name": root_structure_name,
            "type": "compartment",
            "parentName": "-",
            "size": 1.0,
        }
    ]

    for structure in real_structures:
        parent_structure_name = f"{structure['name']}_enc_memb___"
        membrane = {
            "name": parent_structure_name,
            "type": "membrane",
            "parentName": root_structure_name,
            "size": 1.0,
        }
        structures.append(membrane)

        compartment = {
            "name": structure["name"],
            "type": "compartment",
            "parentName": parent_structure_name,
            "size": 1,
        }
        structures.append(compartment)

    return structures
