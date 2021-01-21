from typing import Any, Optional

from pydantic import BaseModel
from typing_extensions import Literal

WorkerStatus = Literal["ready", "busy"]

WorkerMessage = Literal[
    "worker_connect",
    "status",
    "simProgress",
    "simTrace",
    "simStatus",
    "simLogMessage",
    "simLog",
    "simSpatialStepTrace",
    "tmp_sim_log",
]


class SimWorkerMessage(BaseModel):
    message: WorkerMessage
    data: Any
    cmdid: Optional[int]


class Status(SimWorkerMessage):
    message: Literal["status"]
    data: WorkerStatus
