import os
import subprocess
import math
from typing import Callable, Any, Optional

import numpy as np
import pandas as pd

from .sim import SimStatus, SimTrace, SimLogMessage
from .model_to_bngl import model_to_bngl
from .settings import BNG_PATH
from .logger import get_logger
from .utils import tempdir

L = get_logger(__name__)

BNG_MODEL_EXPORT_TIMEOUT = 5


@tempdir()
def run_bng(sim_config: dict, progress_cb: Callable[[Any], None]) -> None:
    def log(message: str, source: Optional[str] = None):
        progress_cb(SimLogMessage(message=message, source=source))

    bngl = sim_config["model_str"] or model_to_bngl(sim_config["model"], write_xml_op=True)

    solver_cfg = sim_config["solverConf"]
    t_end = solver_cfg["tEnd"]
    n_steps = math.floor(t_end / solver_cfg["dt"])
    bngl += f'\nsimulate({{method=>"{sim_config["solver"]}",t_end=>{t_end},n_steps=>{n_steps}}})'

    log(bngl, source="model_bngl")

    L.debug(bngl)

    with open("model.bngl", "w") as model_file:
        model_file.write(bngl)

    L.debug("starting BNG xml model export")
    try:
        bng_run = subprocess.run(
            [BNG_PATH, "model.bngl"],
            check=False,
            capture_output=True,
            timeout=BNG_MODEL_EXPORT_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        log("BNGL was not been able to convert a model into xml within 5 seconds")
        progress_cb(SimStatus(status="error"))
        return

    log(bng_run.stdout.decode("utf-8"), "bng_stdout")
    log(bng_run.stderr.decode("utf-8"), "bng_stderr")
    if bng_run.returncode != 0:
        progress_cb(SimStatus(status="error"))
        return

    L.debug("BNG xml model export has been finished")

    log(bng_run.stdout.decode("utf-8"), "bng_stdout")
    log(bng_run.stderr.decode("utf-8"), "bng_stderr")

    L.debug("BNG return code is {}".format(bng_run.returncode))
    if bng_run.returncode != 0:
        progress_cb(SimStatus(status="error"))
        return

    if not os.path.isfile("model.gdat"):
        log("BNG hasn\t generated model.gdat, check the logs for more information")
        progress_cb(SimStatus(status="error"))
        return

    sim_traces = pd.read_csv("model.gdat", delim_whitespace=True)
    observables = list(sim_traces.columns.tolist()[2:])

    times = np.array(sim_traces.values.tolist())[:, 0]
    values = np.array(sim_traces.values.tolist())[:, 2:]

    times_size_bytes = times.itemsize * len(times)
    values_size_bytes = values.size * values.itemsize
    total_size_bytes = times_size_bytes + values_size_bytes

    chunk_size = 1_000_000  # Roughly 1 MB
    nchunks = total_size_bytes // chunk_size + 1

    elements_per_chunk = len(times) // nchunks

    for i in range(0, len(times), elements_per_chunk):
        times_chunk = times[i : i + elements_per_chunk]
        values_chunk = values[i : i + elements_per_chunk].T

        values_by_observable = {
            observables[i]: [v if not math.isnan(v) else 0 for v in values_chunk[i].tolist()]
            for i in range(len(observables))
        }

        progress_cb(
            SimTrace(
                index=i,
                times=[float(n) for n in times_chunk.tolist()],
                values_by_observable=values_by_observable,
                persist=True,
            )
        )

    progress_cb(SimStatus(status="finished"))
