import os
import json
import re
import time
import math
from datetime import datetime
from typing import Callable, Any, Dict, List
from collections import defaultdict

import numpy as np
import pysb
from pysb.importers import bngl
import sympy
import steps.model as smodel
import steps.geom as sgeom
import steps.rng as srng
import steps.solver as ssolver
import steps.utilities.meshio as meshio
from typing_extensions import Literal

from .model_to_bngl import model_to_bngl, DIFF_PREFIX, STIM_PREFIX, SPAT_PREFIX
from .sim import (
    SimProgress,
    SimTrace,
    SimSpatialStepTrace,
    SimStatus,
    SimLogMessage,
    decompress_stimulation,
)
from .logger import get_logger

L = get_logger(__name__)

GEOMETRY_ROOT_PATH = "/data/geometries"


COMPARTMENT: Literal["compartment"] = "compartment"
MEMBRANE: Literal["membrane"] = "membrane"


PATCH_COMP_TYPE_DICT = {0: "i", 1: "s", 2: "o"}  # inner  # surface  # outer


def get_pysb_spec_comp_name(pysb_spec):
    spec_str = str(pysb_spec)
    return re.search(r".*\*\*\s+(\w+)", spec_str).groups()[0]


class StepsSim:
    def __init__(self, sim_config: dict, progress_cb: Callable[[Any], None]) -> None:
        self.sim_config = sim_config
        self.t_start = datetime.now()
        self.send_progress = progress_cb

    def log(self, message: str) -> None:
        sim_time = datetime.now() - self.t_start
        hours, remainder = divmod(sim_time.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        timestamp = f"{int(hours):02}:{int(minutes):02}:{int(seconds):02}"

        sim_log_msg = SimLogMessage(message=f"{timestamp} {message}")
        self.send_progress(sim_log_msg)

    def run(self) -> None:
        self.send_progress(SimStatus(status="init"))
        self.log("init sim")

        def get_geom_struct_by_model_struct_name(model_struct_name):
            geom_struct_name = next(
                st["geometryStructureName"]
                for st in model_dict["structures"]
                if st["name"] == model_struct_name
            )

            return next(
                st for st in geometry["meta"]["structures"] if st["name"] == geom_struct_name
            )

        def get_comp_name_by_tet_idx(tet_idx):
            geom_comp_name = next(
                st["name"]
                for st in geometry["meta"]["structures"]
                if st["type"] == COMPARTMENT and tet_idx in st["tetIdxs"]
            )

            comp_name = next(
                (
                    st["name"]
                    for st in model_dict["structures"]
                    if st["type"] == COMPARTMENT and st["geometryStructureName"] == geom_comp_name
                ),
                "",
            )

            return comp_name

        model_dict = self.sim_config["model"]
        solver_config = self.sim_config["solverConf"]

        self.log("extend model observables with molecule definitions from stimulation")
        stimuli = decompress_stimulation(self.sim_config["solverConf"]["stimulation"])

        # TODO: refactor weird use of simplify_string, remove stim_name
        def stim_name(stim):
            return "{}{}".format(STIM_PREFIX, simplify_string(stim["target"]))

        model_stim_observable_dict = {
            stim_name(stim): {"name": stim_name(stim), "definition": stim["target"]}
            for stim in stimuli
            if stim["type"] in ["setConc", "clampConc"]
        }
        model_dict["observables"].extend(model_stim_observable_dict.values())

        spatial_sampling_enabled = (
            "spatialSampling" in solver_config and solver_config["spatialSampling"]["enabled"]
        )

        if spatial_sampling_enabled:
            self.log("extend model observables with molecule definitions for spatial sampling")
            spatial_sample_observables = [
                {
                    "name": f'{SPAT_PREFIX}{observable["name"]}',
                    "definition": observable["definition"],
                }
                for observable in solver_config["spatialSampling"]["observables"]
            ]
            model_dict["observables"].extend(spatial_sample_observables)

        self.log("generate BNGL model file with artificial structures")

        bngl_str = model_to_bngl(
            self.sim_config["model"], artificial_structures=True, add_diff_observables=True
        )

        self.log(f"write BNGL model file: \n\n {bngl_str}")
        with open("model.bngl", "w") as model_file:
            model_file.write(bngl_str)

        self.log("create pySB model from BNGL file")
        pysb_model = bngl.model_from_bngl(os.path.join(os.getcwd(), "model.bngl"))

        self.log("generate equations")
        pysb.bng.generate_equations(pysb_model)

        self.log("generate pysb spec names")
        for pysb_spec in pysb_model.species:
            pysb_spec.name = simplify_string(pysb_spec, compartments=False)
            pysb_spec.full_name = simplify_string(pysb_spec, compartments=True)
            pysb_spec.bngl_def = simplify_string(pysb_spec, compartments=False, is_bngl=True)
            pysb_spec.comp_name = get_pysb_spec_comp_name(pysb_spec)

        steps_model = smodel.Model()

        self.log("about to create STEPS species")
        steps_species = []
        spec_name_set = set()
        for pysb_spec_idx, pysb_spec in enumerate(pysb_model.species):
            if pysb_spec.name not in spec_name_set:
                spec_name_set.add(pysb_spec.name)
                self.log("add STEPS spec: {}".format(pysb_spec.name))
                steps_species.append(smodel.Spec(pysb_spec.name, steps_model))

        def get_steps_spec_by_pysb_spec_idx(pysb_spec_idx):
            pysb_spec = pysb_model.species[pysb_spec_idx]
            return next(
                steps_spec for steps_spec in steps_species if steps_spec.getID() == pysb_spec.name
            )

        geometry_id = self.sim_config["model"]["geometry"]["id"]
        geometry_path = os.path.join(GEOMETRY_ROOT_PATH, geometry_id)
        self.log("load mesh id: {}".format(geometry_id))
        mesh = meshio.loadMesh(os.path.join(geometry_path, "mesh"))[0]
        self.log("load geometry.json")
        with open(os.path.join(geometry_path, "geometry.json"), "r") as file:
            geometry = json.loads(file.read())

        # restructure geometry.json if it has old format
        # mesh files are written as read only, can't resave file with preper format
        # TODO: find solution to restructure existing files
        if "scale" in geometry:
            geometry["meta"] = {
                "scale": geometry["scale"],
                "meshNameRoot": geometry["meshNameRoot"],
                "structures": geometry["structures"],
                "freeDiffusionBoundaries": geometry["freeDiffusionBoundaries"],
            }

            geometry.pop("scale", None)
            geometry.pop("meshNameRoot", None)
            geometry.pop("structures", None)
            geometry.pop("freeDiffusionBoundaries", None)

        geom_struct_dict = {
            structure["name"]: structure for structure in geometry["meta"]["structures"]
        }

        self.log("about to prepare STEPS Volume and Surface systems")
        sys_dict = {}
        for structure in model_dict["structures"]:
            name = structure["name"]

            if structure["type"] == COMPARTMENT:
                log_struct_sys_type = "Volume"
            else:
                log_struct_sys_type = "Surface"

            self.log(f"add STEPS {log_struct_sys_type} system for {name}")

            if structure["type"] == COMPARTMENT:
                sys = smodel.Volsys(name, steps_model)
            else:
                sys = smodel.Surfsys(name, steps_model)

            sys_dict[name] = sys

        self.log("about to create STEPS compartments (TmComp)")
        tm_comp_dict = {}
        compartments = [
            structure for structure in model_dict["structures"] if structure["type"] == COMPARTMENT
        ]
        for compartment in compartments:
            name = compartment["name"]
            geom_struct_name = compartment["geometryStructureName"]
            tetIdxs = geom_struct_dict[geom_struct_name]["tetIdxs"]

            self.log(f"add STEPS compartment (TmComp) for {name}")

            tm_comp = sgeom.TmComp(name, mesh, tetIdxs)
            tm_comp.addVolsys(name)
            tm_comp_dict[name] = tm_comp

        def comp_type_by_name(comp_name):
            return next(
                structure["type"]
                for structure in model_dict["structures"]
                if structure["name"] == comp_name
            )

        def get_pysb_reac_comp_names(pysb_reac):
            spec_idxs = list(pysb_reac["reactants"] + pysb_reac["products"])
            specs = [pysb_model.species[idx] for idx in spec_idxs]
            comp_names = list({spec.comp_name for spec in specs})

            return comp_names

        def get_patch_dict_by_comp_names(comp_names):
            comp_name_set = set(comp_names)
            valid_patch_dicts = [
                patch_dict
                for patch_dict in patch_dicts
                if comp_name_set.issubset(set(patch_dict["comp_names_directional"]))
            ]

            if len(valid_patch_dicts) == 0:
                raise ValueError("No membrane found for compartments: {}".format(comp_names))

            if len(valid_patch_dicts) == 1:
                return valid_patch_dicts[0]

            raise NotImplementedError(
                "Found multiple patches for compartments: {}".format(comp_names)
            )

        self.log("about to create STEPS membrane (TmPatch)")
        patch_dicts = []
        membranes = [
            structure for structure in model_dict["structures"] if structure["type"] == MEMBRANE
        ]
        for membrane in membranes:
            name = membrane["name"]
            geom_struct_name = membrane["geometryStructureName"]
            self.log(f"add STEPS membrane (TmPatch) for {name}")
            # .getTriTetNeighb might return -1 if triangle is situated on border of the mesh, and there is no tet
            # from one side
            triIdxs = geom_struct_dict[geom_struct_name]["triIdxs"]
            neighbTetIdxs = np.array([mesh.getTriTetNeighb(triIdx) for triIdx in triIdxs]).flatten()
            neighbTetIdxsFiltered = neighbTetIdxs[neighbTetIdxs >= 0]

            compartment_names = list(
                {get_comp_name_by_tet_idx(tetIdx) for tetIdx in neighbTetIdxsFiltered}
            )

            if "" in compartment_names:
                # compartment name can be empty string if there is no model structure
                # corresponding to a given geometry structure. This can be caused
                # by reusing geometry which has more structures then the model itself
                continue

            if len(compartment_names) > 2:
                raise ValueError("membrane {} connects more then 2 compartments".format(name))

            comp_names_directional = compartment_names
            comp_names_directional.insert(1, name)

            icomp = tm_comp_dict[comp_names_directional[0]]
            ocomp = (
                tm_comp_dict[comp_names_directional[2]]
                if len(comp_names_directional) == 3
                else None
            )

            ocomp_name = ocomp.getID() if ocomp is not None else None
            self.log(f"inner compartment for {name} patch: {icomp.getID()}")
            self.log(f"outer compartment for {name} patch: {ocomp_name}")

            tm_patch = sgeom.TmPatch(
                id=name, container=mesh, tris=triIdxs, icomp=icomp, ocomp=ocomp
            )

            tm_patch.addSurfsys(name)

            patch_dict = {
                "name": name,
                "comp_names_directional": comp_names_directional,
                "tm_patch": tm_patch,
            }
            patch_dicts.append(patch_dict)

        def hs_to_str(hs):
            if len(hs):
                return ", ".join(map(lambda steps_spec: steps_spec.getID(), hs))
            else:
                return "None"

        def create_sreac(reac_name, comp_names, pysb_reac):
            patch_dict = get_patch_dict_by_comp_names(comp_names)

            reac_param_dict = {
                "ilhs": [],
                "slhs": [],
                "olhs": [],
                "irhs": [],
                "srhs": [],
                "orhs": [],
            }

            def add_spec(spec_idx, param_key_base):
                steps_spec = get_steps_spec_by_pysb_spec_idx(spec_idx)
                comp_name = pysb_model.species[spec_idx].comp_name
                param_key_prefix = PATCH_COMP_TYPE_DICT[
                    patch_dict["comp_names_directional"].index(comp_name)
                ]
                param_key = "{}{}hs".format(param_key_prefix, param_key_base)
                reac_param_dict[param_key].append(steps_spec)

            for spec_idx in pysb_reac["reactants"]:
                add_spec(spec_idx, "l")
            for spec_idx in pysb_reac["products"]:
                add_spec(spec_idx, "r")

            patch_name = patch_dict["name"]
            surfsys = sys_dict[patch_name]

            ilhs_str = hs_to_str(reac_param_dict["ilhs"])
            slhs_str = hs_to_str(reac_param_dict["slhs"])
            olhs_str = hs_to_str(reac_param_dict["olhs"])
            irhs_str = hs_to_str(reac_param_dict["irhs"])
            srhs_str = hs_to_str(reac_param_dict["srhs"])
            orhs_str = hs_to_str(reac_param_dict["orhs"])
            self.log(
                f"create STEPS SReac {reac_name} "
                f"using {patch_name} Surface system, "
                f"where"
                f"ilhs: {ilhs_str}, slhs: {slhs_str}, olhs: {olhs_str}, "
                f"irhs: {irhs_str}, srhs: {srhs_str}, orhs: {orhs_str}, "
            )

            steps_reac = smodel.SReac(
                reac_name,
                surfsys,
                ilhs=reac_param_dict["ilhs"],
                slhs=reac_param_dict["slhs"],
                olhs=reac_param_dict["olhs"],
                irhs=reac_param_dict["irhs"],
                srhs=reac_param_dict["srhs"],
                orhs=reac_param_dict["orhs"],
            )

            return steps_reac

        def create_reac(reac_name, comp_name, pysb_reac):
            volsys = sys_dict[comp_name]

            lhs = []
            rhs = []
            for spec_idx in pysb_reac["reactants"]:
                lhs.append(get_steps_spec_by_pysb_spec_idx(spec_idx))
            for spec_idx in pysb_reac["products"]:
                rhs.append(get_steps_spec_by_pysb_spec_idx(spec_idx))

            lhs_str = hs_to_str(lhs)
            rhs_str = hs_to_str(rhs)
            self.log(
                f"create STEPS Reac {reac_name} "
                f"using {comp_name} Volume system, whith lhs: {lhs_str}, rhs: {rhs_str}"
            )

            return smodel.Reac(reac_name, volsys, lhs=lhs, rhs=rhs)

        self.log("about to create STEPS diffusion rules")
        steps_diffs = []
        diff_pysb_spec_idx_dict: Dict[str, List[int]] = defaultdict(list)
        model_diffs = self.sim_config["model"]["diffusions"]

        diff_observables = [
            observable
            for observable in pysb_model.observables
            if re.match(rf"{DIFF_PREFIX}\w+", observable.name) is not None
        ]

        for observable_idx, observable in enumerate(diff_observables):
            match = re.match(f"{DIFF_PREFIX}(.*)", observable.name)
            diff_common_name = "" if match is None else match.groups()[0]
            for pysb_spec_idx in observable.species:
                steps_spec = get_steps_spec_by_pysb_spec_idx(pysb_spec_idx)
                pysb_spec = pysb_model.species[pysb_spec_idx]
                comp_name = get_pysb_spec_comp_name(pysb_spec)
                sys = sys_dict[comp_name]
                dcst = float(model_diffs[observable_idx]["diffusionConstant"])
                diff_name = "{}_{}".format(diff_common_name, pysb_spec.name)
                self.log(f"add diffusion for {pysb_spec.name} in {comp_name}")
                diff = smodel.Diff(diff_name, sys, steps_spec, dcst=dcst)
                steps_diffs.append(diff)

                diff_pysb_spec_idx_dict[comp_name].append(pysb_spec_idx)

        self.log("about to create STEPS reactions")
        steps_reacs = []
        for idx, pysb_reac in enumerate(pysb_model.reactions):
            comp_names = get_pysb_reac_comp_names(pysb_reac)
            reac_name = "{}__r{}".format(pysb_reac["rule"][0], idx)

            # refactor
            steps_reac = (
                create_reac(reac_name, comp_names[0], pysb_reac)
                if len(comp_names) == 1 and isinstance(sys_dict[comp_names[0]], smodel.Volsys)
                else create_sreac(reac_name, comp_names, pysb_reac)
            )
            steps_reacs.append(steps_reac)

        atom_dict = {a.name: a for a in list(pysb_model.parameters) + list(pysb_model.expressions)}

        def set_atom(name, num_value):
            atom = atom_dict[name]

            if atom is None:
                raise ValueError(f"Expression or Parameter {name} not found")

            if isinstance(atom, pysb.core.Parameter):
                atom.value = num_value
            else:
                atom.expr = sympy.Float(num_value)

        def expand_expr(expr):
            subs = []
            for a in expr.atoms():
                if isinstance(a, pysb.core.Expression):
                    subs.append((a, a.expand_expr()))
            return expr.subs(subs)

        def eval_expr(expr):
            param_subs = {p: p.value for p in pysb_model.parameters}

            if isinstance(expr, pysb.core.Parameter):
                return expr.get_value()
            elif isinstance(expr, pysb.core.Expression):
                return expr.expand_expr().evalf(subs=param_subs)
            else:
                return expand_expr(expr).evalf(subs=param_subs)

        def calculate_reac_rate(pysb_reac):
            return eval_expr(pysb_reac["rate"].as_ordered_factors()[-1])

        def init_reac_rates():
            for idx, steps_reac in enumerate(steps_reacs):
                rate_val = calculate_reac_rate(pysb_model.reactions[idx])
                steps_reac.setKcst(rate_val)

        init_reac_rates()

        self.log("about to create STEPS diffusion boundaries")
        diff_boundaries = []
        diff_boundary_spec_names_dict = {}
        for diff_boundary_idx, diff_boundary_dict in enumerate(
            geometry["meta"]["freeDiffusionBoundaries"]
        ):
            tris = diff_boundary_dict["triIdxs"]
            neighbTetIdxs = np.array([mesh.getTriTetNeighb(triIdx) for triIdx in tris]).flatten()
            neighbTetIdxsFiltered = neighbTetIdxs[neighbTetIdxs >= 0]
            comp_names = list(
                {get_comp_name_by_tet_idx(tetIdx) for tetIdx in neighbTetIdxsFiltered}
            )

            if "" in comp_names:
                # compartment name can be empty string if there is no model structure corresponding
                # to a given geometry structure. Can be caused by using of geometry which has more
                # structures then the model itself
                continue

            self.log(
                "creating diff boundary between {} and {}".format(comp_names[0], comp_names[1])
            )
            if len(comp_names) != 2:
                raise ValueError(
                    "Diff boundary idx: {} should border two compartments".format(diff_boundary_idx)
                )
            name = "diffb_{}_{}".format(comp_names[0], comp_names[1])

            diff_boundary = sgeom.DiffBoundary(name, mesh, tris)

            inner_idxs = diff_pysb_spec_idx_dict.get(comp_names[0], [])
            outer_idxs = diff_pysb_spec_idx_dict.get(comp_names[1], [])

            inner_spec_names = [pysb_model.species[idx].name for idx in inner_idxs]
            outer_spec_names = [pysb_model.species[idx].name for idx in outer_idxs]

            diff_spec_names = set(inner_spec_names).intersection(outer_spec_names)
            if len(diff_spec_names) == 0:
                self.log("no species with diffusion activated on both sides of diff boundary found")
            diff_boundary_spec_names_dict[name] = diff_spec_names

            diff_boundaries.append(diff_boundary)

        self.log("set up RNG")
        rng = srng.create("mt19937", 512)
        rng.initialize(654)

        self.log("create STEPS solver")
        sim = ssolver.Tetexact(steps_model, mesh, rng)
        sim.reset()

        # Sim params and targets for trace recording
        dt = solver_config["dt"]
        tend = solver_config["tEnd"]

        stim_tpnt_set = {stim["t"] for stim in stimuli}
        sample_tpnt_set = set(np.arange(0, tend, dt))
        tpnts = np.unique(np.append(list(sample_tpnt_set), list(stim_tpnt_set)))
        tpnts.sort()

        self.log("about to set STEPS initial concentrations")
        for condition in pysb_model.initial_conditions:
            pysb_spec, expr = condition
            spec_name = simplify_string(pysb_spec, compartments=False)
            comp_name = get_pysb_spec_comp_name(pysb_spec)
            comp_type = comp_type_by_name(comp_name)
            value = eval_expr(expr)

            # Unit conversion
            # BNGL units:
            # * 2d - # of molecules
            # * 3d - mM/l
            # STEPS units:
            # * 2d - # of molecules
            # * 3d - mM/m^3
            try:
                if comp_type == COMPARTMENT:
                    self.log(f"set comp conc: @{comp_name}:{spec_name}, val: {value}")
                    sim.setCompConc(comp_name, spec_name, value)

                else:
                    self.log(f"set patch count: @{comp_name}:{spec_name}, val: {value}")
                    sim.setPatchCount(comp_name, spec_name, value)
            except Exception:
                L.warning("Runtime warning")
                L.warning(f"{comp_name}:{spec_name}")

        self.log("about to activate diffusion boundaries")
        for diff_boundary_name, spec_names in diff_boundary_spec_names_dict.items():
            self.log(
                "activate diff boundary {} for {}".format(diff_boundary_name, ", ".join(spec_names))
            )
            for spec_name in spec_names:
                sim.setDiffBoundaryDiffusionActive(diff_boundary_name, spec_name, True)

        trace_observables = [
            observable
            for observable in pysb_model.observables
            if re.match(rf"({DIFF_PREFIX}|{STIM_PREFIX}|{SPAT_PREFIX})\w+", observable.name) is None
        ]
        trace_observable_names = [observable.name for observable in trace_observables]
        trace_values = np.zeros((len(tpnts), len(trace_observables)))

        spatial_observables = [
            observable
            for observable in pysb_model.observables
            if re.match(rf"({SPAT_PREFIX})\w+", observable.name)
        ]

        def apply_stimulus(stim):
            if stim["type"] == "setParam":
                param_name = stim["target"]
                value = float(stim["value"])
                self.log(f"stimulation: setting param {param_name} to {value}")
                set_atom(param_name, value)

                for reac_idx, steps_reac in enumerate(steps_reacs):
                    rate_val = calculate_reac_rate(pysb_model.reactions[reac_idx])
                    if isinstance(steps_reac, smodel.Reac):
                        curr_comp_reac_k = sim.getCompReacK(
                            steps_reac.getVolsys().getID(), steps_reac.getID()
                        )
                        if curr_comp_reac_k != rate_val:
                            self.log(
                                f"stimulation: update comp reacK for {steps_reac.getID()} "
                                f"from {curr_comp_reac_k} to {rate_val}"
                            )
                        sim.setCompReacK(
                            steps_reac.getVolsys().getID(), steps_reac.getID(), rate_val
                        )
                    else:
                        curr_patch_reac_k = sim.getPatchSReacK(
                            steps_reac.getSurfsys().getID(), steps_reac.getID()
                        )
                        if curr_patch_reac_k != rate_val:
                            self.log(
                                f"stim: update surf reacK for {steps_reac.getID()} "
                                f"from {curr_patch_reac_k} to {rate_val}"
                            )
                        sim.setPatchSReacK(
                            steps_reac.getSurfsys().getID(), steps_reac.getID(), rate_val
                        )

            elif stim["type"] == "setConc":
                observable = next(
                    observable
                    for observable in pysb_model.observables
                    if observable.name
                    == "{}{}".format(STIM_PREFIX, simplify_string(stim["target"]))
                )
                pysb_specs = [pysb_model.species[spec_idx] for spec_idx in observable.species]
                if len(pysb_specs) > 1:
                    raise ValueError(
                        "setConc can be used only with one species: {} detected".format(
                            len(pysb_specs)
                        )
                    )
                pysb_spec = pysb_specs[0]
                comp_type = comp_type_by_name(pysb_spec.comp_name)
                # TODO: check if species are present in particular compartments

                target_str = "comp conc" if comp_type == COMPARTMENT else "patch count"
                self.log(
                    f"set {target_str} for @{pysb_spec.comp_name}:{pysb_spec.name} "
                    f'to {stim["value"]}'
                )

                if comp_type == COMPARTMENT:
                    sim.setCompConc(pysb_spec.comp_name, pysb_spec.name, stim["value"])
                else:
                    sim.setPatchCount(pysb_spec.comp_name, pysb_spec.name, stim["value"])

            elif stim["type"] == "clampConc":
                # TODO: DRY
                clamp = stim["value"] == 1
                observable = next(
                    observable
                    for observable in pysb_model.observables
                    if observable.name
                    == "{}{}".format(STIM_PREFIX, simplify_string(stim["target"]))
                )
                pysb_specs = [pysb_model.species[spec_idx] for spec_idx in observable.species]
                for pysb_spec in pysb_specs:
                    comp_name = pysb_spec.comp_name
                    comp_type = comp_type_by_name(comp_name)
                    # TODO: check if species are present in particular compartments
                    self.log(f"set @{comp_name}:{pysb_spec.name} clamped to {clamp}")
                    if comp_type == COMPARTMENT:
                        sim.setCompClamped(comp_name, pysb_spec.name, clamp)
                    else:
                        sim.setPatchClamped(comp_name, pysb_spec.name, clamp)

        self.log("run sim")
        self.send_progress(SimStatus(status="started"))

        for tidx, tpnt in enumerate(tpnts):

            sim.run(tpnt)

            if tpnt in stim_tpnt_set:
                self.log(f"about to apply stimuli for t: {tpnt} s")
                current_stimuli = [stim for stim in stimuli if stim["t"] == tpnt]
                for stim in current_stimuli:
                    apply_stimulus(stim)

            if tpnt in sample_tpnt_set:
                # sample compartemental molecule amounts
                for observable_idx, observable in enumerate(trace_observables):
                    mol_count = 0
                    for pysb_spec_idx in observable.species:
                        pysb_spec = pysb_model.species[pysb_spec_idx]
                        spec_name = pysb_spec.name
                        comp_name = pysb_spec.comp_name
                        comp_type = comp_type_by_name(comp_name)

                        try:
                            if comp_type == COMPARTMENT:
                                spec_count = sim.getCompCount(comp_name, pysb_spec.name)
                            else:
                                spec_count = sim.getPatchCount(comp_name, pysb_spec.name)
                        except Exception:
                            L.warning("Runtime warning")
                        mol_count += spec_count
                    trace_values[
                        tidx, observable_idx
                    ] = mol_count  # Ndarray of (nPoints, nObservables)

                values_by_observable = {
                    observable: [value]
                    for observable, value in zip(trace_observable_names, trace_values[tidx])
                }

                sim_trace = SimTrace(
                    index=tpnt, times=[tpnt], values_by_observable=values_by_observable
                )

                self.send_progress(sim_trace)

                # sample spatial molecule amounts if requested by user
                if (
                    "spatialSampling" in solver_config
                    and solver_config["spatialSampling"]["enabled"]
                ):

                    # make a small pause not to flood a client in case of fast simulation
                    # TODO: implement subscriptions and send spatial step traces only when
                    # client requires them, waiting for ack for each of them.
                    time.sleep(0.02)

                    spatial_trace_data_dict: Dict[str, Dict[str, dict]] = defaultdict(dict)
                    for structure in solver_config["spatialSampling"]["structures"]:
                        structure_name: str = structure["name"]
                        geom_struct = get_geom_struct_by_model_struct_name(structure_name)
                        geom_idxs_key = (
                            "tetIdxs" if geom_struct["type"] == COMPARTMENT else "triIdxs"
                        )
                        geom_idxs_np = np.array(geom_struct[geom_idxs_key], dtype=np.uintc)
                        for spatial_observable in spatial_observables:
                            mol_name = spatial_observable.name.replace(SPAT_PREFIX, "")
                            mol_counts = np.zeros(len(geom_idxs_np))

                            for pysb_spec_idx in spatial_observable.species:
                                pysb_spec = pysb_model.species[pysb_spec_idx]

                                if pysb_spec.comp_name != structure_name:
                                    continue

                                spec_name = pysb_spec.name
                                spec_counts = np.zeros(len(geom_idxs_np))

                                if geom_struct["type"] == COMPARTMENT:
                                    sim.getBatchTetCountsNP(geom_idxs_np, spec_name, spec_counts)
                                else:
                                    sim.getBatchTriCountsNP(geom_idxs_np, spec_name, spec_counts)
                                mol_counts = mol_counts + spec_counts

                            non_zero_counts = mol_counts > 0

                            if np.any(non_zero_counts):
                                spatial_trace_data_dict[structure_name][mol_name] = {
                                    geom_idxs_key: geom_idxs_np[non_zero_counts],
                                    "molCounts": mol_counts[non_zero_counts],
                                }

                    self.send_progress(
                        SimSpatialStepTrace(stepIdx=tidx, t=tpnt, data=spatial_trace_data_dict)
                    )

            num_points = len(tpnts)
            progress = int((tidx + 1) / num_points * 100)

            if (tidx) % math.ceil(len(tpnts) / 100) == 0:
                self.log(f"done {progress}% (sim time: {tpnt} s)")
                self.send_progress(SimProgress(progress=progress))

        times_size_bytes = tpnts.itemsize * len(tpnts)
        values_size_bytes = trace_values.size * trace_values.itemsize
        total_size_bytes = times_size_bytes + values_size_bytes

        chunk_size = 1_000_000  # Roughly 1 MB
        nchunks = total_size_bytes // chunk_size + 1

        elements_per_chunk = len(tpnts) // nchunks

        for chunk_idx in range(0, len(tpnts), elements_per_chunk):
            times_chunk = tpnts[chunk_idx : chunk_idx + elements_per_chunk]
            values_chunk = trace_values[chunk_idx : chunk_idx + elements_per_chunk].T

            values_by_observable = {
                trace_observable_names[i]: values_chunk[i].tolist()
                for i in range(len(trace_observable_names))
            }

            self.send_progress(
                SimTrace(
                    index=chunk_idx,
                    times=times_chunk.tolist(),
                    values_by_observable=values_by_observable,
                    persist=True,
                    stream=False,
                )
            )

        self.log("done")
        self.send_progress(SimStatus(status="finished"))


def simplify_string(st, compartments=True, is_bngl=False):
    st0 = str(st)

    if is_bngl:
        name = re.sub(" ", "", st0)
        name = re.sub("=None", "", name)
        name = re.sub("=", "~", name)
        name = re.sub("'", "", name)
        name = re.sub(r"\*\*", "@", name)
        name = re.sub("%", ".", name)

        if not compartments:
            name = re.sub(r"@\s+\w+", "", name)

        return name

    if st0[0] == "(":
        # find outer parens
        outer = re.compile(r"\((.+)\)")
        match = outer.search(st0)
        st = match.group(1)
    else:
        st = st0

    if not compartments:
        st = re.sub(r"\*\*\s+\w+", "", st)

    sim = re.split(r"\W+", st)
    st2 = sim[0]
    for i in range(1, len(sim)):
        st2 = st2 + "_" + sim[i]
    return st2
