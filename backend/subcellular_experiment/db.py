
import os
import json
import re

import pymongo
from pymongo import MongoClient

from .bngl_extended_model import EntityType, entity_coll_name_map
from .logger import get_logger


# TODO: refactor, split into modules

L = get_logger(__name__)

DB_HOST = os.getenv('DB_HOST')
L.debug('Using mongo host: {}'.format(DB_HOST))


mol_def_r = re.compile('([a-zA-Z][a-zA-Z_0-9]*)\(')
st_def_r = re.compile('@([a-zA-Z][a-zA-Z_0-9]*)')
param_def_r = re.compile('([a-zA-Z][a-zA-Z_0-9]*)')


def get_expr_entities(expr, entity_dict):
    tokens = [
        match_obj.groups()[0]
        for match_obj
        in list(param_def_r.finditer(expr))
    ]

    if len(tokens) == 0:
        return []

    current_entities = [
        entity_dict[token]
        for token
        in tokens
        if token in entity_dict
    ]

    entity_id_set = set([e['_id'] for e in current_entities])

    for entity in current_entities:
        if entity['entityType'] == 'observable':
            continue

        for nested_entity in get_expr_entities(entity['definition'], entity_dict):
            entity_id_set.add(nested_entity['_id'])

    return [entity for entity in entity_dict.values() if entity['_id'] in entity_id_set]

def get_def_structure_ids(definition, db_entities):
    st_def_set = {
        match_obj.groups()[0]
        for match_obj
        in list(st_def_r.finditer(definition))}

    structures = [
        entity
        for entity
        in db_entities
        if entity['entityType'] == EntityType.STRUCTURE]

    spec_structure_ids = [
        st['_id']
        for st
        in structures
        if st['name'] in st_def_set]

    return spec_structure_ids

def get_def_molecule_ids(definition, db_entities):
    mol_def_set = {
        match_obj.groups()[0]
        for match_obj
        in list(mol_def_r.finditer(definition))}

    molecules = [
        entity
        for entity
        in db_entities
        if entity['entityType'] == EntityType.MOLECULE]

    spec_mol_ids = [
        mol['_id']
        for mol
        in molecules
        if mol_def_r.search(mol['definition']).groups()[0] in mol_def_set]

    return spec_mol_ids

def revision_data_from_entity_list(entity_list):
    revision_data = {}
    for entityType, coll_name in entity_coll_name_map.items():
        revision_data[coll_name] = [entity for entity in entity_list if entity['entityType'] == entityType]
    return revision_data


class Db():
    def __init__(self):
        self.mongo_client = MongoClient('mongodb://{}:27017/'.format(DB_HOST))
        L.debug('connected to db')
        self.db = self.mongo_client['subcellular-app']
        self.db.simulations.create_index([
            ('id', pymongo.ASCENDING),
            ('userId', pymongo.ASCENDING),
            ('modelId', pymongo.ASCENDING),
            ('deleted', pymongo.ASCENDING)
        ], unique=True, background=True)

        self.db.simSpatialStepTraces.create_index([
            ('simId', pymongo.ASCENDING),
            ('stepIdx', pymongo.ASCENDING),
        ], unique=True, background=True)

        self.db.simTraces.create_index([
            ('simId', pymongo.ASCENDING)
        ], unique=True, background=True)

        self.db.simLogs.create_index([
            ('simId', pymongo.ASCENDING)
        ], unique=True, background=True)

    def create_geometry(self, geometry_config):
        db_geometry = {
            'name': geometry_config['name'],
            'description': geometry_config['description'],
            'meta': geometry_config['meta'],
            'deleted': False
        }
        return self.db.geometries.insert_one(db_geometry)

    def get_geometry(self, geometry_id):
        return self.db.find_one({ 'id': geometry_id })

    def get_geometries(self, user_id):
        return list(self.db.geometries.find({
            'userId': user_id,
            'deleted': False
        }))

    def create_model(self, model):
        model['deleted'] = False
        self.db.models.insert_one(model)

    def get_user_models(self, user_id):
        return list(self.db.models.find({
            'userId': user_id
        }))

    def get_public_models(self):
        return list(self.db.models.find({
            'public': True
        }))

    def create_simulation(self, simulation):
        simulation['deleted'] = False
        self.db.simulations.insert_one(simulation)

    def get_simulations(self, user_id, model_id):
        return list(self.db.simulations.find({
            'userId': user_id,
            'modelId': model_id,
            'deleted': False
        }))

    def update_simulation(self, simulation):
        self.db.simulations.update_one({
            'id': simulation['id'],
            'userId': simulation['userId'],
            'deleted': False
        }, {
            '$set': simulation
        })

    def create_sim_spatial_step_trace(self, spatial_step_trace):
        self.db.simSpatialStepTraces.insert_one(spatial_step_trace)

    def create_sim_trace(self, sim_trace):
        self.db.simTraces.insert_one(sim_trace)

    def delete_sim_trace(self, simulation):
        self.db.simTraces.delete_many({ 'simId': simulation['id'] })

    def get_sim_trace(self, sim_id):
        return self.db.simTraces.find_one({ 'simId': sim_id })

    def create_sim_log(self, sim_log):
        self.db.simLogs.insert_one(sim_log)

    def get_sim_log(self, sim_id):
        return self.db.simLogs.find_one({ 'simId': sim_id })

    def delete_sim_log(self, simulation):
        self.db.simLogs.delete_many({ 'simId': simulation['id'] })

    def get_spatial_step_trace(self, sim_id, step_idx):
        return self.db.simSpatialStepTraces.find_one({
            'simId': sim_id,
            'stepIdx': step_idx,
        })

    def get_last_spatial_step_trace_idx(self, sim_id):
        spatial_step_traces = self.db.simSpatialStepTraces.find(
            {'simId': sim_id},
            projection=['stepIdx'],
            sort=[('stepIdx', pymongo.DESCENDING)],
            limit=1
        )

        try:
            last_idx = spatial_step_traces[0]['stepIdx']
        except IndexError:
            last_idx = None

        return last_idx

    def delete_simulation(self, simulation):
        self.db.simulations.update_one({
            'id': simulation['id'],
            'userId': simulation['userId']
        }, {
            '$set': {
                'deleted': True
            }
        })

    def delete_sim_spatial_traces(self, simulation):
        self.db.simSpatialStepTraces.delete_many({
            'simId': simulation['id']
        })

    def query_branch_names(self, search_str):
        return self.db.repo.find({ 'branch': { '$regex': search_str }}).distinct('branch')

    def query_revisions(self, branch_name):
        return self.db.repo.find({ 'branch': branch_name }).distinct('rev')

    def query_molecular_repo(self, query_dict):
        L.debug(query_dict)

        mol_q_str = query_dict['moleculeStr']
        struct_q_str = query_dict['structureStr']
        versions = query_dict['versions']
        entity_q_type_set = set(query_dict['entityTypes'])

        mol_q_tokens = [token.strip() for token in mol_q_str.split('\n') if token.strip() != '']
        struct_q_tokens = [token.strip() for token in struct_q_str.split('\n') if token.strip() != '']

        found_entities = []

        # Query structures
        structure_q = {
            'entityType': EntityType.STRUCTURE,
            '$and': []
        }

        rev_q = []
        for version in versions:
            branch = version['branch']
            rev = version['revision']
            query_rev = rev if rev != 'latest' else max(self.db.repo.find({ 'branch': branch }).distinct('rev'))
            rev_q.append({
                'branch': branch,
                'rev': query_rev
            })

        structure_q['$and'].append({'$or': rev_q})

        if struct_q_tokens:
            structure_q['$and'].append({'$or': []})
            st_name_q = structure_q['$and'][-1]['$or']
            for token in struct_q_tokens:
                st_name_q.append({
                    '$or': [{
                        'name': {
                            '$regex': token
                        }
                    }, {
                        'uniProtId': {
                            '$regex': token
                        }
                    }, {
                        'goId': {
                            '$regex': token
                        }
                    }]
                })

        structures = list(self.db.repo.find(structure_q))

        # Query molecules
        mol_q = {
            'entityType': EntityType.MOLECULE,
            '$and': [{
                '$or': rev_q
            }]
        }

        if mol_q_tokens:
            mol_q['$and'].append({'$or': []})
            mol_name_q = mol_q['$and'][-1]['$or']
            for token in mol_q_tokens:
                mol_name_q.append({
                    '$or': [{
                        'name': {
                            '$regex': token
                        }
                    }, {
                        'bng': {
                            '$regex': token
                        }
                    }, {
                        'pubChemId': {
                            '$regex': token
                        }
                    }, {
                        'cid': {
                            '$regex': token
                        }
                    }, {
                        'uniProtId': {
                            '$regex': token
                        }
                    }, {
                        'geneName': {
                            '$regex': token
                        }
                    }]
                })

        molecules = list(self.db.repo.find(mol_q))
        found_entities += molecules

        structure_ids = [structure['_id'] for structure in structures]
        molecule_ids = [molecule['_id'] for molecule in molecules]

        # Query species, reactions and diffusions
        q = {
            'entityType': {
                '$in': [
                    EntityType.SPECIES,
                    EntityType.REACTION,
                    EntityType.DIFFUSION
                ]
            },
            'structureIds': {
                '$in': structure_ids
            },
            'moleculeIds': {
                '$in': molecule_ids
            }
        }

        tmp_entities = list(self.db.repo.find(q))
        found_entities += tmp_entities

        species = [spec for spec in tmp_entities if spec['entityType'] == EntityType.SPECIES]
        reactions = [reac for reac in tmp_entities if reac['entityType'] == EntityType.REACTION]
        diffusions = [diff for diff in tmp_entities if diff['entityType'] == EntityType.DIFFUSION]

        # Filter out structures without species
        spec_structure_ids = [
            entity_id for spec in species
            for entity_id
            in get_def_structure_ids(spec['definition'], structures)
        ]

        structures_with_species = [
            structure
            for structure
            in structures
            if structure['_id'] in spec_structure_ids
        ]

        found_entities += structures_with_species

        parameter_ids = []
        function_ids = []
        observable_ids = []

        for spec in species:
            parameter_ids += spec['parameterIds']
        for reac in reactions:
            parameter_ids += reac['parameterIds']
            function_ids += reac['functionIds']
            observable_ids += reac['observableIds']

        # Query parameters, functions and observables
        q = {
            '_id': {
                '$in': parameter_ids + function_ids + observable_ids
            }
        }
        tmp_entities = list(self.db.repo.find(q))
        found_entities += tmp_entities

        parameters = [param for param in tmp_entities if param['entityType'] == EntityType.PARAMETER]
        functions = [func for func in tmp_entities if func['entityType'] == EntityType.FUNCTION]
        observables = [o for o in tmp_entities if o['entityType'] == EntityType.OBSERVABLE]

        filtered_entities = [e for e in found_entities if e['entityType'] in entity_q_type_set]

        return revision_data_from_entity_list(filtered_entities)


    def get_revision(self, branch, rev):
        query_rev = rev if rev != 'latest' else max(self.db.repo.find({ 'branch': branch }).distinct('rev'))
        all_entities = list(self.db.repo.find({ 'branch': branch, 'rev': query_rev }))
        revision_data = {}
        for entityType, coll_name in entity_coll_name_map.items():
            revision_data[coll_name] = [entity for entity in all_entities if entity['entityType'] == entityType]
        return revision_data

    def get_user_branches(self, user_id):
        branches = self.db.repo.find({ 'userId': user_id }).distinct('branch')
        return branches

    def get_branch_latest_rev(self, branch):
        return max(self.db.repo.find({ 'branch': branch }).distinct('rev'))

    def save_revision(self, revision_data, user_id):
        saved_db_entities = []
        branch = revision_data['branch']
        if self.db.repo.count_documents({ 'branch':  branch}, limit=1):
            rev = max(self.db.repo.find({ 'branch': branch }).distinct('rev')) + 1
        else:
            rev = 1

        entity_types_wo_refs = [
            EntityType.STRUCTURE,
            EntityType.MOLECULE,
            EntityType.PARAMETER,
            EntityType.FUNCTION,
            EntityType.OBSERVABLE
        ]

        for entity_type in entity_types_wo_refs:
            coll_name = entity_coll_name_map[entity_type]
            for entity in revision_data[coll_name]:
                db_entry = {
                    **entity,
                    'rev': rev,
                    'branch': branch,
                    'entityType': entity_type,
                    'userId': user_id
                }
                db_entry.pop('_id', None)
                L.debug('saving: {}'.format(db_entry))
                saved_id = self.db.repo.insert_one(db_entry).inserted_id
                db_entry['_id'] = saved_id
                saved_db_entities.append(db_entry)

        # Additional structures for get_expr_entities to work
        dep_entity_types = [
            EntityType.PARAMETER,
            EntityType.FUNCTION,
            EntityType.OBSERVABLE
        ]
        dep_entities = [e for e in saved_db_entities if e['entityType'] in dep_entity_types]
        dep_entity_dict = {entity['name']:entity for entity in dep_entities}

        # TODO: refactor
        # add ids for structures and molecules for every species
        spec_coll_name = entity_coll_name_map[EntityType.SPECIES]
        for spec in revision_data[spec_coll_name]:
            spec_def = spec['definition']
            structure_ids = get_def_structure_ids(spec_def, saved_db_entities)
            molecule_ids = get_def_molecule_ids(spec_def, saved_db_entities)
            # parameter_ids = get_spec_parameter_ids(spec['concentration'], saved_db_entities)

            parameter_ids = []
            conc_dic = spec['concentration']
            for conc_source in conc_dic:
                parameter_ids += [
                    entity['_id'] for entity
                    in get_expr_entities(conc_dic[conc_source], dep_entity_dict)
                    if entity['entityType'] == EntityType.PARAMETER
                ]

            db_entry = {
                **spec,
                'rev': rev,
                'branch': branch,
                'entityType': EntityType.SPECIES,
                'userId': user_id,
                'structureIds': structure_ids,
                'moleculeIds': molecule_ids,
                'parameterIds': parameter_ids
            }
            db_entry.pop('_id', None)
            saved_id = self.db.repo.insert_one(db_entry).inserted_id
            db_entry['_id'] = saved_id
            saved_db_entities.append(db_entry)

        # add ids for structures and molecules for every reaction
        spec_coll_name = entity_coll_name_map[EntityType.REACTION]
        for reac in revision_data[spec_coll_name]:
            reac_def = reac['definition']
            structure_ids = get_def_structure_ids(reac_def, saved_db_entities)
            molecule_ids = get_def_molecule_ids(reac_def, saved_db_entities)

            # FIXME: add backward kinetic rate param extraction
            parameter_ids = [
                entity['_id'] for entity
                in get_expr_entities(reac['kf'], dep_entity_dict)
                if entity['entityType'] == EntityType.PARAMETER
            ]

            function_ids = [
                entity['_id'] for entity
                in get_expr_entities(reac['kf'], dep_entity_dict)
                if entity['entityType'] == EntityType.FUNCTION
            ]

            observable_ids = [
                entity['_id'] for entity
                in get_expr_entities(reac['kf'], dep_entity_dict)
                if entity['entityType'] == EntityType.OBSERVABLE
            ]

            db_entry = {
                    **reac,
                    'rev': rev,
                    'branch': branch,
                    'entityType': EntityType.REACTION,
                    'userId': user_id,
                    'structureIds': structure_ids,
                    'moleculeIds': molecule_ids,
                    'parameterIds': parameter_ids,
                    'functionIds': function_ids,
                    'observableIds': observable_ids
                }
            db_entry.pop('_id', None)
            saved_id = self.db.repo.insert_one(db_entry).inserted_id
            db_entry['_id'] = saved_id
            saved_db_entities.append(db_entry)

        # add ids for structures and molecules for every diffusion
        spec_coll_name = entity_coll_name_map[EntityType.DIFFUSION]
        for diffusion in revision_data[spec_coll_name]:
            diff_def = diffusion['definition']
            structure_ids = get_def_structure_ids(diff_def, saved_db_entities)
            molecule_ids = get_def_molecule_ids(diff_def, saved_db_entities)
            db_entry = {
                    **diffusion,
                    'rev': rev,
                    'branch': branch,
                    'entityType': EntityType.DIFFUSION,
                    'userId': user_id,
                    'structureIds': structure_ids,
                    'moleculeIds': molecule_ids
                }
            db_entry.pop('_id', None)
            saved_id = self.db.repo.insert_one(db_entry).inserted_id
            db_entry['_id'] = saved_id
            saved_db_entities.append(db_entry)

        return {
            'branch': branch,
            'rev': rev
        }

