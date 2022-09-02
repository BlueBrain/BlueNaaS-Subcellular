import os
import subprocess
import math
from typing import Callable, Any
import numpy as np
import pandas as pd

from subcellular_experiment.api import fetch_model

from .sim import SimStatus, SimTrace, SimLogMessage, decompress_stimulation
from .model_to_bngl import model_to_bngl
from .settings import BNG_PATH, NFSIM_PATH
from .logger import get_logger
from .utils import tempdir

L = get_logger(__name__)

BNG_MODEL_EXPORT_TIMEOUT = 5


class NfSim:
    def __init__(self, sim_config: dict, progress_cb: Callable[[Any], None]) -> None:
        self.sim_config = sim_config
        self.send_progress = progress_cb

    def log(self, message: str, source=None) -> None:
        sim_log_message = SimLogMessage(message=message, source=source)
        self.send_progress(sim_log_message)

    def generate_rnf(self) -> str:
        solver_conf = self.sim_config["solverConf"]
        stimuli = decompress_stimulation(solver_conf["stimulation"])
        t_end = solver_conf["tEnd"]
        dt = solver_conf["dt"]
        next_step_dt = None

        rnf_actions = []

        action_t_vec = list(set([stim["t"] for stim in stimuli if stim["t"] < t_end] + [0, t_end]))
        action_t_vec.sort()
        t = 0
        for action_t in action_t_vec:
            delta_t = action_t - t
            if delta_t != 0:
                n_steps = math.ceil(delta_t / (next_step_dt or dt))
                sim_action = "  sim {} {}".format(delta_t, n_steps)
                rnf_actions.append(sim_action)
            actions = [action for action in stimuli if action["t"] == action_t]
            for action in actions:
                rnf_action = None

                if action["type"] == "setParam":
                    rnf_action = "  set {} {}".format(action["target"], action["value"])
                else:
                    raise ValueError("Unknown stimulus type {}".format(action["type"]))
                rnf_actions.append(rnf_action)
                next_step_dt = action.get("dt", None)
            if len(actions) > 0:
                rnf_actions.append("  update")
            t = action_t

        return "\n".join(
            [
                "-xml model.xml",
                "-v",
                "-utl 3",
                "-o model.gdat",
                "",
                "begin",
                "\n".join(rnf_actions),
                "end",
            ]
        )

    @tempdir()
    def run(self) -> None:

        model_dict = fetch_model(self.sim_config["modelId"], self.sim_config["userId"])

        bngl = model_to_bngl(model_dict, write_xml_op=True)

        self.log(bngl, source="model_bngl")

        rnf = self.generate_rnf()
        self.log(rnf, source="model_rnf")

        with open("model.bngl", "w") as model_file:
            model_file.write(bngl)
        with open("model.rnf", "w") as rnf_file:
            rnf_file.write(rnf)

        L.debug("starting BNG xml model export")
        try:
            bng_run = subprocess.run(
                [BNG_PATH, "model.bngl"],
                check=False,
                capture_output=True,
                timeout=BNG_MODEL_EXPORT_TIMEOUT,
            )
        except subprocess.TimeoutExpired:
            self.log("BNGL was not been able to convert a model into xml within 5 seconds")
            self.send_progress(SimStatus(status="error"))
            return

        self.log(bng_run.stdout.decode("utf-8"), "bng_stdout")
        self.log(bng_run.stderr.decode("utf-8"), "bng_stderr")
        if bng_run.returncode != 0:
            self.send_progress(SimStatus(status="error"))
            return
        L.debug("BNG xml model export has been finished")

        L.debug("starting NFsim")
        nfsim_run = subprocess.run(
            [NFSIM_PATH, "-csv", "-logo", "-gml", "10000000", "-rnf", "model.rnf"],
            check=False,
            capture_output=True,
        )
        self.log(nfsim_run.stdout.decode("utf-8"), "nfsim_stdout")
        self.log(nfsim_run.stderr.decode("utf-8"), "nfsim_stderr")

        L.debug("NFsim return code is {}".format(nfsim_run.returncode))
        if nfsim_run.returncode != 0:
            self.send_progress(SimStatus(status="error"))
            return

        if not os.path.isfile("model.gdat"):
            self.log("NFsim hasn\t generated model.gdat, check the logs for more information")
            self.send_progress(SimStatus(status="error"))
            return

        sim_traces = pd.read_csv("model.gdat")
        observables = list(sim_traces.columns.tolist()[1:])

        times = np.array(sim_traces.values.tolist())[:, 0]
        values = np.array(sim_traces.values.tolist())[:, 1:]

        times_size_bytes = times.itemsize * len(times)
        values_size_bytes = values.size * values.itemsize
        total_size_bytes = times_size_bytes + values_size_bytes

        chunk_size = 1_000_000  # Roughly 1 MB
        nchunks = total_size_bytes // chunk_size + 1

        elements_per_chunk = len(times) // nchunks

        for i in range(0, len(times), elements_per_chunk):
            times_chunk = times[i : i + elements_per_chunk]
            values_chunk = values[i : i + elements_per_chunk].T

            values_by_observable = {observables[i]: values_chunk[i].tolist() for i in range(len(observables))}
            self.send_progress(
                SimTrace(
                    index=i,
                    times=times_chunk.tolist(),
                    values_by_observable=values_by_observable,
                    persist=True,
                )
            )

        self.send_progress(SimStatus(status="finished"))
