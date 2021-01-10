import re
from typing import List

from libsbml import (
    readSBMLFromString,
    SpeciesReference,
    KineticLaw,
    UnitDefinition,
    Model,
)


def parseUnitValue(unit_definition: UnitDefinition) -> float:
    """Returns the value of unit_definition in sbml base units.
    http://sbml.org/Software/libSBML/5.18.0/docs/python-api/classlibsbml_1_1_unit_definition.html
    """
    value = 1.0
    for unit in unit_definition.getListOfUnits():
        value = value ** unit.getExponent()
        value *= unit.getMultiplier()
    return value


def species_str(species_refs: List[SpeciesReference], model: Model):
    """Returns a string of the form:

    Species1()@Compartement1 + Species2@Compartment2
    """
    species_by_id = {species.getId(): species for species in model.getListOfSpecies()}
    compartment_name_by_id = {
        compartment.getId(): compartment.getName() for compartment in model.getListOfCompartments()
    }
    species_objs = (species_by_id[species_ref.getSpecies()] for species_ref in species_refs)

    return " + ".join(
        f"{species.getName()}()@{compartment_name_by_id[species.getCompartment()]}"
        for species in species_objs
    )


def rate_laws(kinetic_law: KineticLaw, model: Model):
    formula = kinetic_law.getFormula().replace(" ", "")

    parameter_name_by_id = {
        parameter.getId(): parameter.getName().strip().replace(" ", "_")
        for parameter in model.getListOfParameters()
    }

    return ", ".join(
        parameter_name_by_id[id_]
        for id_ in re.split("[-|+|*|/]", formula)
        if id_ in parameter_name_by_id
    )


def sbml_to_bngl(xml: str):
    """Parses an sbml xml file and transforms it into bngl."""
    document = readSBMLFromString(xml)
    errors = document.getNumErrors()

    if errors > 0:
        raise ValueError("Invalid SBML file")

    model = document.getModel()

    units = "\n".join(
        f"{unit.getId()} {parseUnitValue(unit)}    #{unit.getName()}"
        for unit in model.getListOfUnitDefinitions()
    )

    parameters = "\n".join(
        f"{parameter.getName().strip().replace(' ', '_')} {parameter.getValue()} * {parameter.getUnits()}"
        for parameter in model.getListOfParameters()
    )

    compartments = "\n".join(
        f"{compartment.getName()} {compartment.getSpatialDimensions()} {compartment.getSize()}"
        for compartment in model.getListOfCompartments()
    )

    compartment_name_by_id = {
        compartment.getId(): compartment.getName() for compartment in model.getListOfCompartments()
    }

    molecules = "\n".join(
        f"{species.getName().strip().replace(' ', '_')}()" for species in model.getListOfSpecies()
    )

    species = "\n".join(
        f"{'$' if species.getConstant() else ''}{species.getName().strip().replace(' ', '_')}"
        f"@{compartment_name_by_id[species.getCompartment()]} {species.getInitialConcentration()}"
        f"*{species.getUnits()}"
        for species in model.getListOfSpecies()
    )

    observables = "\n".join(
        f"Molecules {species.getName().strip().replace(' ', '_')} "
        f"@{compartment_name_by_id[species.getCompartment()]}:"
        f"{species.getName().strip().replace(' ', '_')}()"
        for species in model.getListOfSpecies()
    )

    reactions = "\n".join(
        f"reaction{i}: {species_str(reaction.getListOfReactants(), model)}"
        f" {'<->' if reaction.getReversible() else '->'} "
        f"{species_str(reaction.getListOfProducts(), model)} "
        f"{rate_laws(reaction.getKineticLaw(), model)}"
        for i, reaction in enumerate(model.getListOfReactions())
    )

    return f"""begin model

    begin parameters

    {units}
    {parameters}

    end parameters

    begin compartments

    {compartments}

    end compartments

    begin molecule types

    {molecules}

    end molecule types

    begin species

    {species}

    end species

    begin observables

    {observables}

    end observables

    begin reaction rules

    {reactions}

    end reaction rules

    end model
    """
