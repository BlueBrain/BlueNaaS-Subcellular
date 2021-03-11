from typing import Optional, Any, List

from typing_extensions import Literal
from tornado import websocket
from pydantic import BaseModel


SimStatus = Literal["created", "queued", "init", "started", "error", "finished", "cancelled"]
ModelFormat = Literal["bngl", "ebngl", "pysb_flat", "sbml"]


class SimConfig(BaseModel):
    userId: str
    status: str
    solverConf: dict
    solver: Literal["steps", "nfsim"]
    simId: str
    progress: Optional[int]
    name: str
    modelId: str
    model: dict
    id: str
    annotation: str


class Message(BaseModel):
    cmd: str
    cmdid: Optional[int]
    data: Any


class SimId(BaseModel):
    id: str
    userId: str


class Observable(BaseModel):
    _checked: bool
    annotation: str
    definition: str
    name: str


class Structure(BaseModel):
    _checked: Optional[bool]
    annotation: str
    geometryStructureName: str
    geometryStructureSize: float
    name: str
    parentName: str
    size: float
    type: str


class Stimulation(BaseModel):
    data: List[float]
    size: int
    targetValues: List[str]


class SpatialSampling(BaseModel):
    enabled: bool
    observables: List[Observable]
    structures: List[Structure]


class SolverConfig(BaseModel):
    dt: float
    spatialSampling: Optional[SpatialSampling]
    stimulation: Stimulation
    tEnd: float
    valid: bool


class Simulation(BaseModel):
    annotation: str
    id: str
    modelId: str
    userId: str
    name: str
    progress: Optional[float]
    solver: Literal["steps", "nfsim"]
    solverConf: SolverConfig
    status: SimStatus
    valid: str


class UpdateSimulation(BaseModel):
    annotation: Optional[str]
    id: Optional[str]
    modelId: Optional[str]
    userId: Optional[str]
    name: Optional[str]
    progress: Optional[float]
    solver: Optional[Literal["steps", "nfsim"]]
    solverConf: Optional[SolverConfig]
    status: Optional[SimStatus]
    valid: Optional[bool]


class GetSimulations(BaseModel):
    modelId: str


class Entity(BaseModel):
    name: str
    definition: str
    annotation: str


class Function(Entity):
    name: str
    definition: str
    annotation: str


class Species(Entity):
    concentration: str


class Reaction(Entity):
    kf: str
    kr: str


class Diffusion(BaseModel):
    valid: str
    name: str
    speciesDefinition: str
    diffusionConstant: float
    compartment: str
    annotation: str


class Model(BaseModel):
    id: str
    name: str
    structures: List[Structure]
    parameters: List[Entity]
    functions: List[Function]
    molecules: List[Entity]
    species: List[Species]
    observables: List[Entity]
    reactions: List[Reaction]
    diffusions: List[Diffusion]
    public: Optional[bool]
    nonBnglStructures: Optional[bool]


class GetExportedModel(BaseModel):
    model: Model
    format: ModelFormat


class WebSocketHandler(websocket.WebSocketHandler):
    async def send_message(self, cmd: str, data: Any = None, cmdid: Optional[int] = None) -> None:
        raise NotImplementedError
