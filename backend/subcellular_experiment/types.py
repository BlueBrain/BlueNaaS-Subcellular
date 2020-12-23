from typing import Optional, Any

from typing_extensions import Literal
from pydantic import BaseModel


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
    cmdid: Optional[str]
    data: Any


class RunSimulationMessage(BaseModel):
    cmd: Literal["run_simulation"]
    cmdid: Optional[str]
    data: SimConfig


WorkerStatus = Literal["ready", "busy"]
