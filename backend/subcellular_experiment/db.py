import re
import asyncio

import pymongo
import wrapt
from pymongo.errors import ConfigurationError, AutoReconnect
from motor.motor_asyncio import AsyncIOMotorClient
from sentry_sdk import capture_message

from .model_to_bngl import ENTITY_TYPES
from .logger import get_logger, log_many
from .envvars import MONGO_URI, DB_HOST, DB_PASSWORD
from .types import SimId, Simulation, UpdateSimulation

L = get_logger(__name__)


L.debug(f"Using mongo host: {DB_HOST}")


mol_def_r = re.compile(r"([a-zA-Z][a-zA-Z_0-9]*)\(")
st_def_r = re.compile("@([a-zA-Z][a-zA-Z_0-9]*)")
param_def_r = re.compile("([a-zA-Z][a-zA-Z_0-9]*)")


def get_expr_entities(expr, entity_dict):
    tokens = [match_obj.groups()[0] for match_obj in list(param_def_r.finditer(expr))]

    if len(tokens) == 0:
        return []

    current_entities = [entity_dict[token] for token in tokens if token in entity_dict]

    entity_id_set = {e["_id"] for e in current_entities}

    for entity in current_entities:
        if entity["entityType"] == "observable":
            continue

        for nested_entity in get_expr_entities(entity["definition"], entity_dict):
            entity_id_set.add(nested_entity["_id"])

    return [entity for entity in entity_dict.values() if entity["_id"] in entity_id_set]


def get_def_structure_ids(definition, db_entities):
    st_def_set = {match_obj.groups()[0] for match_obj in list(st_def_r.finditer(definition))}

    structures = [entity for entity in db_entities if entity["entityType"] == "structure"]

    spec_structure_ids = [st["_id"] for st in structures if st["name"] in st_def_set]

    return spec_structure_ids


def get_def_molecule_ids(definition, db_entities):
    mol_def_set = {match_obj.groups()[0] for match_obj in list(mol_def_r.finditer(definition))}

    molecules = [entity for entity in db_entities if entity["entityType"] == "molecule"]

    spec_mol_ids = [
        mol["_id"]
        for mol in molecules
        if mol_def_r.search(mol["definition"]).groups()[0] in mol_def_set
    ]

    return spec_mol_ids


def revision_data_from_entity_list(entity_list):
    return {
        f"{entity_type}s": [entity for entity in entity_list if entity["entityType"] == entity_type]
        for entity_type in ENTITY_TYPES
    }


@wrapt.decorator
async def mongo_autoreconnect(wrapped, instance, args, kwargs):  # pylint: disable=unused-argument
    for i in range(2, 6):
        try:
            return await wrapped(*args, **kwargs)
        except AutoReconnect:
            log_many("Mongodb retrying", L.info, capture_message)
            await asyncio.sleep(2**i)
    log_many("Can't connect to mongodb", L.error, capture_message)


class Db:
    def __init__(self):

        uri = (
            f"mongodb://admin:{DB_PASSWORD}@{DB_HOST}:27017/"
            if DB_PASSWORD
            else f"mongodb://{DB_HOST}:27017/"
        )

        self.mongo_client = AsyncIOMotorClient(uri)
        L.debug(uri)
        L.debug("connected to db")

        if MONGO_URI is None:
            raise ConfigurationError(message="MONGO_URI envar not set")

        self.db = self.mongo_client[MONGO_URI]

    def create_indexes(self):
        asyncio.create_task(self._create_indexes())

    async def _create_indexes(self):
        await self.db.simulations.create_index(
            [
                ("id", pymongo.ASCENDING),
                ("userId", pymongo.ASCENDING),
                ("modelId", pymongo.ASCENDING),
                ("deleted", pymongo.ASCENDING),
            ],
            unique=True,
            background=True,
        )

        await self.db.simSpatialStepTraces.create_index(
            [
                ("simId", pymongo.ASCENDING),
                ("stepIdx", pymongo.ASCENDING),
            ],
            unique=True,
            background=True,
        )

        await self.db.simTraces.create_index(
            [("simId", pymongo.ASCENDING), ("index", pymongo.ASCENDING)],
            unique=True,
            background=True,
        )

        await self.db.simLogs.create_index(
            [("simId", pymongo.ASCENDING)], unique=True, background=True
        )

        L.debug("Created db indexes")

    @mongo_autoreconnect
    async def create_geometry(self, geometry_config):
        db_geometry = {
            "name": geometry_config["name"],
            "description": geometry_config["description"],
            "meta": geometry_config["meta"],
            "deleted": False,
        }
        return await self.db.geometries.insert_one(db_geometry)

    @mongo_autoreconnect
    async def get_geometry(self, geometry_id):
        return await self.db.find_one({"id": geometry_id})

    @mongo_autoreconnect
    async def create_simulation(self, simulation: Simulation):
        await self.db.simulations.insert_one({**simulation.dict(), "deleted": False})

    @mongo_autoreconnect
    async def get_simulations(self, user_id: str, model_id: str):
        return await self.db.simulations.find(
            {"userId": user_id, "modelId": model_id, "deleted": False}
        ).to_list(None)

    @mongo_autoreconnect
    async def update_simulation(self, simulation: UpdateSimulation):
        await self.db.simulations.update_one(
            {"id": simulation.id, "userId": simulation.userId, "deleted": False},
            {"$set": simulation.dict(exclude_none=True)},
        )

    @mongo_autoreconnect
    async def create_sim_spatial_step_trace(self, spatial_step_trace: dict) -> None:
        await self.db.simSpatialStepTraces.insert_one(spatial_step_trace)

    @mongo_autoreconnect
    async def create_sim_trace(self, sim_trace: dict) -> None:
        await self.db.simTraces.insert_one(sim_trace)

    @mongo_autoreconnect
    async def get_sim_trace(self, sim_id: str) -> None:
        return await self.db.simTraces.find({"simId": sim_id}).to_list(None)

    @mongo_autoreconnect
    async def delete_sim_trace(self, simulation: SimId):
        await self.db.simTraces.delete_many({"simId": simulation.id})

    @mongo_autoreconnect
    async def create_sim_log(self, sim_log):
        await self.db.simLogs.insert_one(sim_log)

    @mongo_autoreconnect
    async def get_sim_log(self, sim_id):
        return await self.db.simLogs.find_one({"simId": sim_id})

    @mongo_autoreconnect
    async def delete_sim_log(self, simulation: SimId):
        await self.db.simLogs.delete_many({"simId": simulation.id})

    @mongo_autoreconnect
    async def get_spatial_step_trace(self, sim_id, step_idx):
        return await self.db.simSpatialStepTraces.find_one(
            {
                "simId": sim_id,
                "stepIdx": step_idx,
            }
        )

    @mongo_autoreconnect
    async def get_last_spatial_step_trace_idx(self, sim_id):
        spatial_step_traces = await self.db.simSpatialStepTraces.find(
            {"simId": sim_id},
            projection=["stepIdx"],
            sort=[("stepIdx", pymongo.DESCENDING)],
            limit=1,
        ).to_list(None)

        if len(spatial_step_traces) == 0:
            return None

        return spatial_step_traces[0]["stepIdx"]

    @mongo_autoreconnect
    async def delete_simulation(self, simulation: SimId):
        await self.db.simulations.update_one(
            {"id": simulation.id, "userId": simulation.userId}, {"$set": {"deleted": True}}
        )

    @mongo_autoreconnect
    async def delete_sim_spatial_traces(self, simulation: SimId):
        await self.db.simSpatialStepTraces.delete_many({"simId": simulation.id})

    @mongo_autoreconnect
    async def query_branch_names(self, search_str):
        return await self.db.repo.find({"branch": {"$regex": search_str}}).distinct("branch")

    @mongo_autoreconnect
    async def query_revisions(self, branch_name):
        return await self.db.repo.find({"branch": branch_name}).distinct("rev")

    @mongo_autoreconnect
    async def query_molecular_repo(self, query_dict):
        L.debug(query_dict)

        mol_q_str = query_dict["moleculeStr"]
        struct_q_str = query_dict["structureStr"]
        versions = query_dict["versions"]
        entity_q_type_set = set(query_dict["entityTypes"])

        mol_q_tokens = [token.strip() for token in mol_q_str.split("\n") if token.strip() != ""]
        struct_q_tokens = [
            token.strip() for token in struct_q_str.split("\n") if token.strip() != ""
        ]

        found_entities = []

        # Query structures
        structure_q = {"entityType": "structure", "$and": []}

        rev_q = []
        for version in versions:
            branch = version["branch"]
            rev = version["revision"]
            query_rev = (
                rev
                if rev != "latest"
                else max(await self.db.repo.find({"branch": branch}).distinct("rev"))
            )
            rev_q.append({"branch": branch, "rev": query_rev})

        structure_q["$and"].append({"$or": rev_q})

        if struct_q_tokens:
            structure_q["$and"].append({"$or": []})
            st_name_q = structure_q["$and"][-1]["$or"]
            for token in struct_q_tokens:
                st_name_q.append(
                    {
                        "$or": [
                            {"name": {"$regex": token}},
                            {"uniProtId": {"$regex": token}},
                            {"goId": {"$regex": token}},
                        ]
                    }
                )

        structures = await self.db.repo.find(structure_q).to_list(None)

        if struct_q_tokens and not structures:
            return revision_data_from_entity_list([])

        # Query molecules
        mol_q = {"entityType": "molecule", "$and": [{"$or": rev_q}]}

        if mol_q_tokens:
            mol_q["$and"].append({"$or": []})
            mol_name_q = mol_q["$and"][-1]["$or"]
            for token in mol_q_tokens:
                mol_name_q.append(
                    {
                        "$or": [
                            {"name": {"$regex": token}},
                            {"bng": {"$regex": token}},
                            {"pubChemId": {"$regex": token}},
                            {"cid": {"$regex": token}},
                            {"uniProtId": {"$regex": token}},
                            {"geneName": {"$regex": token}},
                        ]
                    }
                )

        molecules = await self.db.repo.find(mol_q).to_list(None)
        found_entities += molecules

        structure_ids = [structure["_id"] for structure in structures]
        molecule_ids = [molecule["_id"] for molecule in molecules]

        # Query species, reactions and diffusions
        q = {
            "entityType": {"$in": ["species", "reaction", "diffusion"]},
            "structureIds": {"$in": structure_ids},
            "moleculeIds": {"$in": molecule_ids},
        }

        tmp_entities = await self.db.repo.find(q).to_list(None)
        found_entities += tmp_entities

        species = [spec for spec in tmp_entities if spec["entityType"] == "species"]
        reactions = [reac for reac in tmp_entities if reac["entityType"] == "reaction"]

        # Filter out structures without species
        spec_structure_ids = [
            entity_id
            for spec in species
            for entity_id in get_def_structure_ids(spec["definition"], structures)
        ]

        structures_with_species = [
            structure for structure in structures if structure["_id"] in spec_structure_ids
        ]

        found_entities += structures_with_species

        parameter_ids = []
        function_ids = []
        observable_ids = []

        for spec in species:
            parameter_ids += spec["parameterIds"]
        for reac in reactions:
            parameter_ids += reac["parameterIds"]
            function_ids += reac["functionIds"]
            observable_ids += reac["observableIds"]

        # Query parameters, functions and observables
        q = {"_id": {"$in": parameter_ids + function_ids + observable_ids}}
        tmp_entities = await self.db.repo.find(q).to_list(None)
        found_entities += tmp_entities

        filtered_entities = [e for e in found_entities if e["entityType"] in entity_q_type_set]

        return revision_data_from_entity_list(filtered_entities)

    @mongo_autoreconnect
    async def get_revision(self, branch, rev):
        query_rev = (
            rev
            if rev != "latest"
            else max(await self.db.repo.find({"branch": branch}).distinct("rev"))
        )
        all_entities = await self.db.repo.find({"branch": branch, "rev": query_rev}).to_list(None)
        return revision_data_from_entity_list(all_entities)

    @mongo_autoreconnect
    async def get_user_branches(self, user_id):
        branches = await self.db.repo.find({"userId": user_id}).distinct("branch")
        return branches

    @mongo_autoreconnect
    async def get_branch_latest_rev(self, branch):
        return max(await self.db.repo.find({"branch": branch}).distinct("rev"))

    @mongo_autoreconnect
    async def save_revision(self, revision_data, user_id):
        saved_db_entities = []
        branch = revision_data["branch"]
        if await self.db.repo.count_documents({"branch": branch}, limit=1):
            rev = max(await self.db.repo.find({"branch": branch}).distinct("rev")) + 1
        else:
            rev = 1

        entity_types_wo_refs = [
            "structure",
            "molecule",
            "parameter",
            "function",
            "observable",
        ]

        for entity_type in entity_types_wo_refs:
            for entity in revision_data[entity_type + "s"]:
                db_entry = {
                    **entity,
                    "rev": rev,
                    "branch": branch,
                    "entityType": entity_type,
                    "userId": user_id,
                }
                db_entry.pop("_id", None)
                L.debug("saving: {}".format(db_entry))
                saved_id = self.db.repo.insert_one(db_entry).inserted_id
                db_entry["_id"] = saved_id
                saved_db_entities.append(db_entry)

        # Additional structures for get_expr_entities to work
        dep_entity_types = ["parameter", "function", "observable"]
        dep_entities = [e for e in saved_db_entities if e["entityType"] in dep_entity_types]
        dep_entity_dict = {entity["name"]: entity for entity in dep_entities}

        # TODO: refactor
        # add ids for structures and molecules for every species
        for spec in revision_data["species"]:
            spec_def = spec["definition"]
            structure_ids = get_def_structure_ids(spec_def, saved_db_entities)
            molecule_ids = get_def_molecule_ids(spec_def, saved_db_entities)
            # parameter_ids = get_spec_parameter_ids(spec['concentration'], saved_db_entities)

            parameter_ids = []
            conc_dic = spec["concentration"]
            for conc_source in conc_dic:
                parameter_ids += [
                    entity["_id"]
                    for entity in get_expr_entities(conc_dic[conc_source], dep_entity_dict)
                    if entity["entityType"] == "parameter"
                ]

            db_entry = {
                **spec,
                "rev": rev,
                "branch": branch,
                "entityType": "species",
                "userId": user_id,
                "structureIds": structure_ids,
                "moleculeIds": molecule_ids,
                "parameterIds": parameter_ids,
            }
            db_entry.pop("_id", None)
            saved_id = await self.db.repo.insert_one(db_entry).inserted_id
            db_entry["_id"] = saved_id
            saved_db_entities.append(db_entry)

        # add ids for structures and molecules for every reaction
        for reac in revision_data["reactions"]:
            reac_def = reac["definition"]
            structure_ids = get_def_structure_ids(reac_def, saved_db_entities)
            molecule_ids = get_def_molecule_ids(reac_def, saved_db_entities)

            # FIXME: add backward kinetic rate param extraction
            parameter_ids = [
                entity["_id"]
                for entity in get_expr_entities(reac["kf"], dep_entity_dict)
                if entity["entityType"] == "parameter"
            ]

            function_ids = [
                entity["_id"]
                for entity in get_expr_entities(reac["kf"], dep_entity_dict)
                if entity["entityType"] == "function"
            ]

            observable_ids = [
                entity["_id"]
                for entity in get_expr_entities(reac["kf"], dep_entity_dict)
                if entity["entityType"] == "observable"
            ]

            db_entry = {
                **reac,
                "rev": rev,
                "branch": branch,
                "entityType": "reaction",
                "userId": user_id,
                "structureIds": structure_ids,
                "moleculeIds": molecule_ids,
                "parameterIds": parameter_ids,
                "functionIds": function_ids,
                "observableIds": observable_ids,
            }
            db_entry.pop("_id", None)
            saved_id = await self.db.repo.insert_one(db_entry).inserted_id
            db_entry["_id"] = saved_id
            saved_db_entities.append(db_entry)

        # add ids for structures and molecules for every diffusion
        for diffusion in revision_data["diffusions"]:
            diff_def = diffusion["definition"]
            structure_ids = get_def_structure_ids(diff_def, saved_db_entities)
            molecule_ids = get_def_molecule_ids(diff_def, saved_db_entities)
            db_entry = {
                **diffusion,
                "rev": rev,
                "branch": branch,
                "entityType": "diffusion",
                "userId": user_id,
                "structureIds": structure_ids,
                "moleculeIds": molecule_ids,
            }
            db_entry.pop("_id", None)
            saved_id = self.db.repo.insert_one(db_entry).inserted_id
            db_entry["_id"] = saved_id
            saved_db_entities.append(db_entry)

        return {"branch": branch, "rev": rev}
