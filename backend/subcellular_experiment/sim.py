from typing import Dict, List, Optional, Union, Literal
from pydantic import BaseModel

from .types import SimStatus as SimStatusLiteral


STIMULUS_TYPE_BY_CODE = {
    0: "setParam",
    1: "setConc",
    2: "clampConc",
}


def decompress_stimulation(stimulation):
    stimuli = []
    for idx in range(stimulation["size"]):
        t = stimulation["data"][idx * 4]
        stim_type = STIMULUS_TYPE_BY_CODE[stimulation["data"][idx * 4 + 1]]
        target = stimulation["targetValues"][stimulation["data"][idx * 4 + 2]]
        value = stimulation["data"][idx * 4 + 3]
        stimuli.append({"t": t, "type": stim_type, "target": target, "value": value})

    return stimuli


class SimSpatialStepTrace(BaseModel):
    type: Literal["simSpatialStepTrace"] = "simSpatialStepTrace"
    stepIdx: int
    t: float
    data: Dict[str, Dict[str, dict]]


class SimLogMessage(BaseModel):
    type: Literal["simLogMessage"] = "simLogMessage"
    message: str
    source: str = "system"


class SimLog(BaseModel):
    type: Literal["simLog"] = "simLog"
    log: Dict[str, List[str]]


class SimProgress(BaseModel):
    type: Literal["simProgress"] = "simProgress"
    progress: float


class SimTrace(BaseModel):
    """Simulation trace for a given observable.

    Attributes:
        times: List of time points
        values: Dict mapping of observables to values
    """

    type: Literal["simTrace"] = "simTrace"
    index: int
    persist: bool = False
    stream: bool = True
    times: List[float]
    values_by_observable: Dict[str, List[float]]


class SimStatus(BaseModel):
    type: Literal["simStatus"] = "simStatus"
    status: SimStatusLiteral
    description: Optional[str]


SimData = Union[SimSpatialStepTrace, SimLogMessage, SimLog, SimProgress, SimTrace, SimStatus, None]
