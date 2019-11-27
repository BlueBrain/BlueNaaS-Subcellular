
import json
import re


NA = 6.02214086e23


DIFF_PREFIX = '___int_sys_diff___'
STIM_PREFIX = '___int_sys_stim___'
SPAT_PREFIX = '___int_sys_spat___'

class StructureType:
    COMPARTMENT = 'compartment'
    MEMBRANE = 'membrane'


class EntityType:
    STRUCTURE = 'structure'
    PARAMETER = 'parameter'
    FUNCTION = 'function'
    MOLECULE = 'molecule'
    SPECIES = 'species'
    OBSERVABLE = 'observable'
    REACTION = 'reaction'
    DIFFUSION = 'diffusion'

entity_coll_name_map = {
    EntityType.STRUCTURE: 'structures',
    EntityType.PARAMETER: 'parameters',
    EntityType.FUNCTION: 'functions',
    EntityType.MOLECULE: 'molecules',
    EntityType.SPECIES: 'species',
    EntityType.OBSERVABLE: 'observables',
    EntityType.REACTION: 'reactions',
    EntityType.DIFFUSION: 'diffusions'
}

entity_helper_dict = {
    'parameter': {
        'modelProp': 'parameters',
        'blockStart': 'begin parameters',
        'blockEnd': 'end parameters'
    },
    'structure': {
        'modelProp': 'structures',
        'blockStart': 'begin compartments',
        'blockEnd': 'end compartments'
    },
    'molecule': {
        'modelProp': 'molecules',
        'blockStart': 'begin molecule types',
        'blockEnd': 'end molecule types'
    },
    'species': {
        'modelProp': 'species',
        'blockStart': 'begin species',
        'blockEnd': 'end species'
    },
    'observable': {
        'modelProp': 'observables',
        'blockStart': 'begin observables',
        'blockEnd': 'end observables'
    },
    'function': {
        'modelProp': 'functions',
        'blockStart': 'begin functions',
        'blockEnd': 'end functions'
    },
    'diffusion': {
        'modelProp': 'diffusions',
        'blockStart': 'begin diffusions',
        'blockEnd': 'end diffusions'
    },
    'reaction': {
        'modelProp': 'reactions',
        'blockStart': 'begin reaction rules',
        'blockEnd': 'end reaction rules'
    }
}

bngl_standard_entity_types = ['parameter', 'structure', 'molecule', 'species', 'observable', 'function', 'reaction']

class BnglExtModel():
    def __init__(self, model_dict):
        self.model_dict = model_dict

        self.entity_to_string_dict = {
            'parameter': self.param_to_str,
            'function': self.function_to_str,
            'structure': self.structure_to_str,
            'molecule': self.molecule_to_str,
            'observable': self.observable_to_str,
            'diffusion': self.diffusion_to_str_as_observable,
            'species': self.species_to_str,
            'reaction': self.reaction_to_str
        }

    def param_to_str(self, param):
        return '  {} {}'.format(param['name'], param['definition'])

    def function_to_str(self, func):
        return '  {}({}) = {}'.format(
            func['name'],
            func.get('argument', ''),
            func['definition']
        )

    def structure_to_str(self, struct):
        dimensions = 3 if struct['type'] == StructureType.COMPARTMENT else 2
        parent_name = struct['parentName'] if struct['parentName'] != '-' else ''
        return '  {} {} {} {}'.format(
            struct['name'],
            dimensions,
            struct['size'],
            parent_name
        )

    def molecule_to_str(self, mol):
        return '  {}'.format(mol['definition'])

    def observable_to_str(self, o):
        return '  Molecules {} {}'.format(o['name'], o['definition'])

    def diffusion_to_str_as_observable(self, diff):
        return '  Molecules {}{} {}@{}'.format(
            DIFF_PREFIX,
            diff['name'],
            diff['speciesDefinition'],
            diff['compartment']
        )

    def species_to_str(self, spec):
        spec_def = spec['definition']
        if not self.unit_conversion:
            return '  {} {}'.format(spec_def, spec['concentration'])

        struct_name = re.match('@(\w*)', spec_def).groups()[0]
        struct_size = next(
            struct['size']
            for struct in self.model_dict['structures']
            if struct['name'] == struct_name
        )
        conv_k = '{} * 10e3 * {}'.format(NA, struct_size)
        conc = spec['concentration']
        amount = '  {} ({}) * {}'.format(spec_def, conc, conv_k)

    def reaction_to_str(self, reac):
        name = reac['name']

        return '  {}{} {}{}'.format(
            '{}: '.format(name) if name is not '-' else '',
            reac['definition'],
            reac['kf'],
            ', {}'.format(reac['kr']) if '<->' in reac['definition'] else ''
        )

    def generate_artificial_structures(self):
        root_structure_name = 'ext_comp___'
        real_structures = self.model_dict['structures'].copy()
        structures = [{
            'name': root_structure_name,
            'type': StructureType.COMPARTMENT,
            'parentName': '-',
            'size': 1.0
        }]

        for structure in real_structures:
            parent_structure_name = '{}_enc_memb___'.format(structure['name'])
            membrane = {
                'name': parent_structure_name,
                'type': StructureType.MEMBRANE,
                'parentName': root_structure_name,
                'size': 1.0
            }
            structures.append(membrane)

            compartment = {
                'name': structure['name'],
                'type': StructureType.COMPARTMENT,
                'parentName': parent_structure_name,
                'size': 1
            }
            structures.append(compartment)

        return structures

    def to_bngl(self, write_xml_op=False, unit_conversion=False,
                artificial_structures=False, add_diff_observables=False):

        self.unit_conversion = unit_conversion
        bngl_lines = []

        bngl_lines.append('begin model\n')

        for entity_type in bngl_standard_entity_types:
            entity_helper = entity_helper_dict[entity_type]
            if len(self.model_dict[entity_helper['modelProp']]) == 0:
                continue;

            bngl_lines.append(entity_helper['blockStart'])

            if entity_type == 'structure' and artificial_structures:
                entities = self.generate_artificial_structures()
            else:
                entities = self.model_dict[entity_helper['modelProp']]

            for entity in entities:
                entity_str = self.entity_to_string_dict[entity_type](entity)
                bngl_lines.append(entity_str)
            if entity_type == 'observable' and add_diff_observables:
                diffusion_helper = entity_helper_dict['diffusion']
                for diffusion in self.model_dict['diffusions']:
                    bngl_lines.append(self.entity_to_string_dict['diffusion'](diffusion))
            bngl_lines.append(entity_helper['blockEnd'] + '\n')

        bngl_lines.append('end model')
        if write_xml_op:
            bngl_lines.append('writeXML({prefix=>"model"})')

        return '\n'.join(bngl_lines) + '\n'
