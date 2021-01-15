from typing import Optional, Any

from typing_extensions import Literal
from tornado import websocket
from pydantic import BaseModel

WorkerStatus = Literal["ready", "busy"]
SimStatus = Literal["queued", "init", "started", "error", "finished", "cancelled"]


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


class SimWorkerMessage(BaseModel):
    message: str
    data: Any
    cmdid: Optional[int]


class SimId(BaseModel):
    id: str
    userId: str


class WebSocketHandler(websocket.WebSocketHandler):
    async def send_message(self, cmd: str, data: Any = None, cmdid: Optional[int] = None) -> None:
        raise NotImplementedError
