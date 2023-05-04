import re
from typing import List

from libsbml import readSBMLFromString, SpeciesReference, UnitDefinition, Species, Model


def reserved_unit(unit_name: str):
    reserved = ["time", "volume", "substance", "time", "length"]
    if unit_name in reserved:
        return unit_name + "_"
    return unit_name


def parse_unit(unit_definition: UnitDefinition) -> str:
    value = 1.0
    for unit in unit_definition.getListOfUnits():
        value = (value * unit.getMultiplier() * 10 ** unit.getScale()) ** unit.getExponent()

    return f"{reserved_unit(unit_definition.getId())} {value} #{unit_definition.getName()}"


def parse_species(species: Species, model: Model) -> str:
    compartment_by_id = {compartment.getId(): compartment for compartment in model.getListOfCompartments()}

    compartment = compartment_by_id.get(species.getCompartment())

    return (
        f"{'$' if species.getConstant() else ''}{species.getName().strip().replace(' ', '_')}()"
        + (f"@{compartment.getName()}" if compartment is not None else "")
        + f" {species.getInitialConcentration()}"
        + f"*{reserved_unit(species.getUnits()) or 1}"
    )


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
        f"{species.getName()}()@{compartment_name_by_id[species.getCompartment()]}" for species in species_objs
    )


def is_non_standard_kinetic_law(formula: str):
    terms = re.split("[-|+|*|/]", formula.replace(" ", ""))
    return any(not re.match(r"\w+", term) for term in terms)


def rate_laws(i: int, formula: str, model: Model):
    """Converts an sbml kinetic law to a series of bionetgen reaction rules."""
    formula = formula.replace(" ", "")

    if is_non_standard_kinetic_law(formula):
        return f"rate_f{i}() TotalRate"

    parameter_name_by_id = {
        parameter.getId(): parameter.getName().strip().replace(" ", "_") for parameter in model.getListOfParameters()
    }

    return ", ".join(parameter_name_by_id[id_] for id_ in re.split("[-|+|*|/]", formula) if id_ in parameter_name_by_id)


def sbml_to_bngl(xml: str):
    """Parses an sbml xml file and transforms it into bngl."""
    document = readSBMLFromString(xml)
    errors = document.getNumErrors()

    if errors > 0:
        raise ValueError("Invalid SBML file")

    model = document.getModel()

    units = "\n".join(parse_unit(unit) for unit in model.getListOfUnitDefinitions())

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

    kinetic_law_formulas = (reaction.getKineticLaw().getFormula() for reaction in model.getListOfReactions())

    functions = "\n".join(
        f"rate_f{i}() = {formula}"
        for i, formula in enumerate(kinetic_law_formulas)
        if is_non_standard_kinetic_law(formula)
    )

    molecules = "\n".join(f"{species.getName().strip().replace(' ', '_')}()" for species in model.getListOfSpecies())

    species = "\n".join(parse_species(species, model) for species in model.getListOfSpecies())

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
        f"{rate_laws(i, reaction.getKineticLaw().getFormula(), model)}"
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

begin functions

{functions}

end functions

begin reaction rules

{reactions}

end reaction rules

end model
    """
