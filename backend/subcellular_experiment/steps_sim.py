
import os
import json
import re

import numpy as np

import pysb
from pysb.importers import bngl

from sympy import Symbol

import steps
import steps.model as smodel
import steps.geom as sgeom
import steps.rng as srng
import steps.solver as ssolver
import steps.utilities.meshio as meshio

from .bngl_extended_model import BnglExtModel
from .sim import SimTraceMeta, SimStepTrace, SimTrace, SimStatus, TraceTarget, StimulusType
from .logger import get_logger


L = get_logger(__name__)

GEOMETRY_ROOT_PATH = '/data/geometries'

class StructureType():
    COMPARTMENT = 'compartment'
    MEMBRANE = 'membrane'

PATCH_COMP_TYPE_DICT = {
        0: 'i', # inner
        1: 's', # surface
        2: 'o'  # outer
    }

def get_pysb_spec_comp_name(pysb_spec):
    spec_str = str(pysb_spec)
    return re.search('.*\*\*\s+(\w+)', spec_str).groups()[0]


class StepsSim():
    def __init__(self, sim_config):
        self.sim_config = sim_config

    def run(self):
        def simplify_string(st, compartments=True, bngl=False):
            st0 = str(st)

            if bngl:
                name = re.sub(' ', '', st0)
                name = re.sub('=None', '', name)
                name = re.sub('=', '~', name)
                name = re.sub('\'', '', name)
                name = re.sub('\*\*', '@', name)
                name = re.sub('%', '.', name)

                if not compartments:
                    name = re.sub('@\s+\w+', '', name)

                return name

            if st0[0] == '(':
                # find outer parens
                outer = re.compile('\((.+)\)')
                m = outer.search(st0)
                st = m.group(1)
            else:
                st = st0

            if compartments==False:
                st = re.sub('\*\*\s+\w+', '', st)

            sim = re.split('\W+', st)
            st2 = sim[0]
            for i in range(1, len(sim)):
                st2 = st2 + '_' + sim[i]
            return st2


        def get_comp_name_by_tet_idx(tet_idx):
            return next(
                st['name']
                for st in geometry['structures']
                if st['type'] == StructureType.COMPARTMENT and tet_idx in st['tetIdxs']
            )

        L.debug('create BNGL Extended model')
        model_dict = self.sim_config['model']

        L.debug('extend model observables with those used in stimuli')
        stimuli = self.sim_config['solverConf']['stimuli']
        # TODO: refactor weird use of simplify_string, remove stim_name
        stim_name = lambda stim: 'stim___{}'.format(simplify_string(stim['target']))
        model_stim_observable_dict = {
            stim_name(stim): {'name': stim_name(stim), 'definition': stim['target']}
            for stim in stimuli
            if stim['type'] in ['setConc', 'clampConc']
        }
        model_dict['observables'].extend(model_stim_observable_dict.values())

        bngl_ext_model = BnglExtModel(self.sim_config['model'])
        bngl_str = bngl_ext_model.to_bngl()

        L.debug('write BNGL file')
        with open('model.bngl', 'w') as model_file:
            L.debug(json.dumps(bngl_str))
            model_file.write(bngl_str)

        L.debug('create pySB model')
        pysb_model = bngl.model_from_bngl(os.path.join(os.getcwd(), 'model.bngl'))

        L.debug('generate equations')
        pysb.bng.generate_equations(pysb_model)

        L.debug('generate pysb spec names')
        for pysb_spec in pysb_model.species:
            pysb_spec.name = simplify_string(pysb_spec, compartments=False)
            pysb_spec.full_name = simplify_string(pysb_spec, compartments=True)
            pysb_spec.bngl_def = simplify_string(pysb_spec, compartments=False, bngl=True)
            pysb_spec.comp_name = get_pysb_spec_comp_name(pysb_spec)

        steps_model = smodel.Model()

        L.debug('create STEPS species')
        steps_species = []
        spec_name_set = set()
        for pysb_spec_idx, pysb_spec in enumerate(pysb_model.species):
            if pysb_spec.name not in spec_name_set:
                spec_name_set.add(pysb_spec.name)
                L.debug('add spec: {}'.format(pysb_spec.name))
                steps_species.append(smodel.Spec(pysb_spec.name, steps_model))


        def get_steps_spec_by_pysb_spec_idx(pysb_spec_idx):
            pysb_spec = pysb_model.species[pysb_spec_idx]
            return next(
                steps_spec
                for steps_spec in steps_species
                if steps_spec.getID() == pysb_spec.name
            )


        geometry_id = self.sim_config['model']['geometry']['id']
        geometry_path = os.path.join(GEOMETRY_ROOT_PATH, geometry_id)
        L.debug('load mesh id: {}'.format(geometry_id))
        mesh = meshio.loadMesh(os.path.join(geometry_path, 'mesh'))[0]
        L.debug('load geometry.json')
        geometry = json.loads(open(os.path.join(geometry_path, 'geometry.json')).read())


        L.debug('create STEPS Volume and Surface systems')
        sys_dict = {}
        for structure in geometry['structures']:
            name = structure['name']

            if structure['type'] == StructureType.COMPARTMENT:
                sys = smodel.Volsys(name, steps_model)
            else:
                sys = smodel.Surfsys(name, steps_model)

            sys_dict[name] = sys


        L.debug('create STEPS 3d compartments (TmComp)')
        tm_comp_dict = {}
        compartments = [
            structure
            for structure in geometry['structures']
            if structure['type'] == StructureType.COMPARTMENT
        ]
        for compartment in compartments:
            name = compartment['name']
            tm_comp = sgeom.TmComp(name, mesh, compartment['tetIdxs'])
            tm_comp.addVolsys(name)
            tm_comp_dict[name] = tm_comp


        def comp_type_by_name(comp_name):
            return next(
                structure['type']
                for structure in geometry['structures']
                if structure['name'] == comp_name
            )


        def get_pysb_reac_comp_names(pysb_reac):
            spec_idxs = list(pysb_reac['reactants'] + pysb_reac['products'])
            specs = [pysb_model.species[idx] for idx in spec_idxs]
            comp_names = list(set([spec.comp_name for spec in specs]))
            return comp_names


        def get_patch_dict_by_comp_names(comp_names):
            comp_name_set = set(comp_names)
            valid_patch_dicts = [patch_dict
                                for patch_dict
                                in patch_dicts
                                if comp_name_set.issubset(set(patch_dict['comp_names_directional']))
                                ]

            if len(valid_patch_dicts) == 0:
                raise ValueError('No membrane found for compartments: {}'.format(comp_names))

            if len(valid_patch_dicts) == 1:
                return valid_patch_dicts[0]

            raise NotImplementedError('Found multiple patches for compartments: {}'.format(comp_names))


        L.debug('create STEPS 2d compartments (TmPatch)')
        patch_dicts = []
        membranes = [
            structure
            for structure in geometry['structures']
            if structure['type'] == StructureType.MEMBRANE
        ]
        for membrane in membranes:
            name = membrane['name']
            L.debug('adding patch for membrane: {}'.format(name))
            # .getTriTetNeighb might return -1 if triangle is situated on border of the mesh, and there is no tet
            # from one side
            neighbTetIdxs = np.array([mesh.getTriTetNeighb(triIdx) for triIdx in membrane['triIdxs']]).flatten()
            neighbTetIdxsFiltered = neighbTetIdxs[neighbTetIdxs >= 0]

            compartment_names = list(set([get_comp_name_by_tet_idx(tetIdx) for tetIdx in neighbTetIdxsFiltered]))
            if len(compartment_names) > 2:
                raise ValueError('membrane {} connects more then 2 compartments'.format(name))

            comp_names_directional = compartment_names
            comp_names_directional.insert(1, name)

            icomp = tm_comp_dict[comp_names_directional[0]]
            ocomp = tm_comp_dict[comp_names_directional[2]] if len(comp_names_directional) == 3 else None
            L.debug('Inner compartment: {}'.format(icomp.getID()))
            L.debug('Outer compartment: {}'.format(ocomp.getID() if ocomp is not None else None))

            tm_patch = sgeom.TmPatch(id=name,
                                    container=mesh,
                                    tris=membrane['triIdxs'],
                                    icomp=icomp,
                                    ocomp=ocomp
                                    )

            tm_patch.addSurfsys(name)

            patch_dict = {
                'name': name,
                'comp_names_directional': comp_names_directional,
                'tm_patch': tm_patch
            }
            patch_dicts.append(patch_dict)


        def create_sreac(reac_name, comp_names, pysb_reac):
            patch_dict = get_patch_dict_by_comp_names(comp_names)
            tm_patch = patch_dict['tm_patch']
            reac_param_dict = {
                'ilhs': [],
                'slhs': [],
                'olhs': [],
                'irhs': [],
                'srhs': [],
                'orhs': []
            }

            def add_spec(spec_idx, param_key_base):
                steps_spec = get_steps_spec_by_pysb_spec_idx(spec_idx)
                comp_name = pysb_model.species[spec_idx].comp_name
                param_key_prefix = PATCH_COMP_TYPE_DICT[patch_dict['comp_names_directional'].index(comp_name)]
                param_key = '{}{}hs'.format(param_key_prefix, param_key_base)
                reac_param_dict[param_key].append(steps_spec)

            for spec_idx in pysb_reac['reactants']:
                add_spec(spec_idx, 'l')
            for spec_idx in pysb_reac['products']:
                add_spec(spec_idx, 'r')

            surfsys = sys_dict[patch_dict['name']]
            steps_reac = smodel.SReac(reac_name,
                                    surfsys,
                                    ilhs=reac_param_dict['ilhs'],
                                    slhs=reac_param_dict['slhs'],
                                    olhs=reac_param_dict['olhs'],
                                    irhs=reac_param_dict['irhs'],
                                    srhs=reac_param_dict['srhs'],
                                    orhs=reac_param_dict['orhs'],
                                    )

            return steps_reac


        def create_reac(reac_name, comp_name, pysb_reac):
            volsys = sys_dict[comp_name]

            lhs = []
            rhs = []
            for spec_idx in pysb_reac['reactants']:
                lhs.append(get_steps_spec_by_pysb_spec_idx(spec_idx))
            for spec_idx in pysb_reac['products']:
                rhs.append(get_steps_spec_by_pysb_spec_idx(spec_idx))

            return smodel.Reac(reac_name, volsys, lhs=lhs, rhs=rhs)


        L.debug('create STEPS diffusion rules')
        steps_diffs = []
        diff_pysb_spec_idx_dict = {}
        model_diffs = self.sim_config['model']['diffusions']
        diff_observables = [observable for observable in pysb_model.observables if re.match('diff___\w+', observable.name) is not None]
        for observable_idx, observable in enumerate(diff_observables):
            diff_common_name = re.match('diff___(.*)', observable.name).groups()[0]
            for pysb_spec_idx in observable.species:
                steps_spec = get_steps_spec_by_pysb_spec_idx(pysb_spec_idx)
                pysb_spec = pysb_model.species[pysb_spec_idx]
                comp_name = get_pysb_spec_comp_name(pysb_spec)
                sys = sys_dict[comp_name]
                dcst = float(model_diffs[observable_idx]['diffusionConstant'])
                diff_name = '{}_{}'.format(diff_common_name, pysb_spec.name)
                L.debug('create diff for {} in {}'.format(pysb_spec.name, comp_name))
                diff = smodel.Diff(diff_name, sys, steps_spec, dcst=dcst)
                steps_diffs.append(diff)

                if comp_name not in diff_pysb_spec_idx_dict:
                    diff_pysb_spec_idx_dict[comp_name] = []
                diff_pysb_spec_idx_dict[comp_name].append(pysb_spec_idx)


        L.debug('create STEPS reactions')
        steps_reacs = []
        for idx, pysb_reac in enumerate(pysb_model.reactions):
            comp_names = get_pysb_reac_comp_names(pysb_reac)
            reac_name = '{}__r{}'.format(pysb_reac['rule'][0], idx)

            # refactor
            steps_reac = create_reac(reac_name, comp_names[0], pysb_reac) if len(comp_names) == 1 and type(sys_dict[comp_names[0]]) is smodel.Volsys else create_sreac(reac_name, comp_names, pysb_reac)
            steps_reacs.append(steps_reac)


        param_dict = {p.name: p.value for p in pysb_model.parameters}
        expr_dict = {e.name: e for e in pysb_model.expressions}
        custom_param_val_dict = {}

        def eval_expr(expr):
            if expr.name in custom_param_val_dict:
                return custom_param_val_dict[expr.name]

            if expr.name in param_dict:
                return param_dict[expr.name]

            subs = {
                e: param_dict[e.name] if e.name in param_dict else eval_expr(expr_dict[e.name])
                for e in list(expr.expand_expr().atoms())
                if e.is_symbol
            }
            return expr.expand_expr().evalf(subs=subs)



        def init_reac_rates():
            for idx, steps_reac in enumerate(steps_reacs):
                kinetic_rate_expr = pysb_model.reactions[idx]['rate'].as_ordered_factors()[-1]
                rate_val = eval_expr(kinetic_rate_expr)
                steps_reac.setKcst(rate_val)
        init_reac_rates()


        L.debug('create STEPS diffusion boundaries')
        diff_boundaries = []
        diff_boundary_spec_names_dict = {}
        for diff_boundary_idx, diff_boundary_dict in enumerate(geometry['freeDiffusionBoundaries']):
            tris = diff_boundary_dict['triIdxs']
            neighbTetIdxs = np.array([mesh.getTriTetNeighb(triIdx) for triIdx in tris]).flatten()
            neighbTetIdxsFiltered = neighbTetIdxs[neighbTetIdxs >= 0]
            comp_names = list(set([get_comp_name_by_tet_idx(tetIdx) for tetIdx in neighbTetIdxsFiltered]))
            L.debug('creating diff boundary for comps: {} and {}'.format(comp_names[0], comp_names[1]))
            if len(comp_names) != 2:
                raise ValueError('Diff boundary idx: {} should border two compartments'.format(diff_boundary_idx))
            name = 'diffb_{}_{}'.format(comp_names[0], comp_names[1])

            diff_boundary = sgeom.DiffBoundary(name, mesh, tris)

            inner_idxs = diff_pysb_spec_idx_dict.get(comp_names[0], [])
            outer_idxs = diff_pysb_spec_idx_dict.get(comp_names[1], [])

            inner_spec_names = [pysb_model.species[idx].name for idx in inner_idxs]
            outer_spec_names = [pysb_model.species[idx].name for idx in outer_idxs]

            diff_spec_names = set(inner_spec_names).intersection(outer_spec_names)
            if len(diff_spec_names) == 0:
                L.debug('no species with diffusion activated on both sides of diff boundary found')
            diff_boundary_spec_names_dict[name] = diff_spec_names

            diff_boundaries.append(diff_boundary)


        L.debug('set up RNG')
        rng = srng.create('mt19937', 512)
        rng.initialize(654)


        L.debug('create STEPS solver')
        sim = ssolver.Tetexact(steps_model, mesh, rng)
        sim.reset()

        # Sim params and targets for trace recording
        solver_config = self.sim_config['solverConf']
        dt = solver_config['dt']
        tend = solver_config['tEnd']

        stim_tpnt_set = set([stim['t'] for stim in stimuli])
        tpnts = np.unique(np.append(np.arange(0, tend, dt), list(stim_tpnt_set)))
        tpnts.sort()

        L.debug('set STEPS initial concentrations')
        for condition in pysb_model.initial_conditions:
            pysb_spec, expr = condition
            spec_name = simplify_string(pysb_spec, compartments=False)
            comp_name = get_pysb_spec_comp_name(pysb_spec)
            comp_type = comp_type_by_name(comp_name)
            value = eval_expr(expr)
            L.debug('init cond: @{}:{}, val: {}'.format(comp_name, spec_name, value))

            # Unit conversion
            # BNGL units:
            # * 2d - # of molecules
            # * 3d - mM/l
            # STEPS units:
            # * 2d - # of molecules
            # * 3d - mM/m^3
            if comp_type == StructureType.COMPARTMENT:
                sim.setCompConc(comp_name, spec_name, value)
            else:
                sim.setPatchCount(comp_name, spec_name, value)

        L.debug('activate diffusion boundaries')
        for diff_boundary_name, spec_names in diff_boundary_spec_names_dict.items():
            L.debug('activating diff boundary {} for {}'.format(
                diff_boundary_name,
                ', '.join(spec_names)
            ))
            for spec_name in spec_names:
                sim.setDiffBoundaryDiffusionActive(diff_boundary_name, spec_name, True)


        L.debug('run sim and calculate observable species')
        trace_observables = [
            observable
            for observable in pysb_model.observables
            if re.match('(diff___|stim___)\w+', observable.name) is None
        ]
        trace_observable_names = [observable.name for observable in trace_observables]
        L.debug('observables to calculate: {}'.format(', '.join(trace_observable_names)))
        trace_values = np.zeros((len(tpnts), len(pysb_model.species)))


        # Send simulation meta
        structures = [{'name': structure['name']} for structure in geometry['structures']]
        species = [{'name': simplify_string(spec, bngl=True)} for spec in pysb_model.species]
        observables = []
        for observable in trace_observables:
            spec_idxs = list(observable.species)
            observables.append({
                'name': observable.name,
                'specIdxs': spec_idxs
            })
        trace_meta = SimTraceMeta(TraceTarget.SPECIES,
                                len(tpnts),
                                structures=structures,
                                species=species,
                                observables=observables)
        yield trace_meta

        def apply_stimulus(stim):
            if stim['type'] == StimulusType.SET_PARAM:
                param_name = stim['target']
                value = stim['value']
                custom_param_val_dict[param_name] = value

                # TODO: move logic to apply rates outside
                for reac_idx, steps_reac in enumerate(steps_reacs):
                    kinetic_rate_expr = pysb_model.reactions[reac_idx]['rate'].as_ordered_factors()[-1]
                    rate_val = eval_expr(kinetic_rate_expr)
                    if (type(steps_reac) == smodel.Reac):
                        sim.setCompReacK(steps_reac.getVolsys().getID(), steps_reac.getID(), rate_val)
                    else:
                        sim.setPatchSReacK(steps_reac.getSurfsys().getID(), steps_reac.getID(), rate_val)

            elif stim['type'] == StimulusType.SET_CONC:
                observable = next(
                    observable
                    for observable in pysb_model.observables
                    if observable.name == 'stim___{}'.format(simplify_string(stim['target']))
                )
                pysb_specs = [pysb_model.species[spec_idx] for spec_idx in observable.species]
                if len(pysb_specs) > 1:
                    raise ValueError('setConc can be used only with one species: {} detected'.format(len(pysb_specs)))
                pysb_spec = pysb_specs[0]
                comp_type = comp_type_by_name(pysb_spec.comp_name)
                # TODO: check if species are present in particular compartments
                L.debug('set {}@{} conc to {}'.format(pysb_spec.name, pysb_spec.comp_name, stim['value']))
                if comp_type == StructureType.COMPARTMENT:
                    sim.setCompCount(pysb_spec.comp_name, pysb_spec.name, stim['value'])
                else:
                    sim.setPatchCount(pysb_spec.comp_name, pysb_spec.name, stim['value'])

            elif stim['type'] == StimulusType.CLAMP_CONC:
                # TODO: DRY
                clamp = True if stim['value'] == 1 else False
                observable = next(
                    observable
                    for observable in pysb_model.observables
                    if observable.name == 'stim___{}'.format(simplify_string(stim['target']))
                )
                pysb_specs = [pysb_model.species[spec_idx] for spec_idx in observable.species]
                for pysb_spec in pysb_specs:
                    comp_name = pysb_spec.comp_name
                    comp_type = comp_type_by_name(comp_name)
                    # TODO: check if species are present in particular compartments
                    L.debug('set {}@{} clamped to {}'.format(pysb_spec.name, comp_name, clamp))
                    if comp_type == StructureType.COMPARTMENT:
                        sim.setCompClamped(comp_name, pysb_spec.name, clamp)
                    else:
                        sim.setPatchClamped(comp_name, pysb_spec.name, clamp)

        for tidx, tpnt in enumerate(tpnts):
            L.debug('run step {} out of {}'.format(tidx + 1, len(tpnts)))

            sim.run(tpnt)
            L.debug('finished step {} out of {}'.format(tidx + 1, len(tpnts)))
            for pysb_spec_idx, pysb_spec in enumerate(pysb_model.species):
                comp_name = pysb_spec.comp_name
                comp_type = comp_type_by_name(comp_name)
                if comp_type == StructureType.COMPARTMENT:
                    trace_values[tidx, pysb_spec_idx] = sim.getCompCount(comp_name, pysb_spec.name)
                else:
                    trace_values[tidx, pysb_spec_idx] = sim.getPatchCount(comp_name, pysb_spec.name)
            sim_step_trace = SimStepTrace(tpnt, tidx, trace_values[tidx])
            yield sim_step_trace

            if tpnt in stim_tpnt_set:
                L.debug('apply stimuli for t: {} s'.format(tpnt))
                current_stimuli = [stim for stim in stimuli if stim['t'] == tpnt]
                for stim in current_stimuli:
                    apply_stimulus(stim)

        yield SimTrace(TraceTarget.SPECIES,
                    tpnts,
                    trace_values,
                    structures=structures,
                    species=species,
                    observables=observables)

        yield SimStatus(SimStatus.FINISHED)
