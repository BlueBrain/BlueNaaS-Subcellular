import os
import tempfile
import shutil


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


class SimSpatialStepTrace:
    TYPE = "simSpatialStepTrace"

    def __init__(self, step_idx, t, trace_data):
        self.type = self.TYPE

        self.step_idx = step_idx
        self.t = t
        self.trace_data = trace_data

    def to_dict(self):
        return {"stepIdx": self.step_idx, "t": self.t, "data": self.trace_data}


class SimLogMessage:
    TYPE = "simLogMessage"

    def __init__(self, message, source="system"):
        self.type = self.TYPE

        self.message = message
        self.source = source

    def to_dict(self):
        return {"message": self.message, "source": self.source}


class SimProgress:
    TYPE = "simProgress"

    def __init__(self, progress):
        self.type = self.TYPE

        self.progress = progress

    def to_dict(self):
        return {"progress": self.progress}


class SimLog:
    TYPE = "simLog"

    def __init__(self, log_dict):
        self.log = log_dict

    def to_dict(self):
        return self.log


class SimStepTrace:
    TYPE = "simStepTrace"

    def __init__(self, t, step_idx, values, observables):
        self.type = self.TYPE

        self.t = t
        self.step_idx = step_idx
        self.values = values
        self.observables = observables

    def to_dict(self):
        return {"t": self.t, "stepIdx": self.step_idx, "observables": self.observables, "values": self.values}


class SimTrace:
    TYPE = "simTrace"
    index: int

    def __init__(self, index: int, times, values, observables):
        self.type = self.TYPE
        self.index = index
        self.n_steps = len(times)
        self.times = times
        self.values = values
        self.observables = observables

    def to_dict(self):
        return {
            "index": self.index,
            "nSteps": self.n_steps,
            "times": self.times,
            "values": self.values,
            "observables": self.observables,
        }


class SimStatus:
    QUEUED = "queued"
    INIT = "init"
    STARTED = "started"
    ERROR = "error"
    FINISHED = "finished"
    CANCELLED = "cancelled"

    TYPE = "simStatus"

    def __init__(self, status, description=None):
        self.type = self.TYPE
        self.status = status
        self.description = description

    def to_dict(self):
        return {
            "status": self.status,
            "description": self.description,
        }


class StimulusType:
    SET_PARAM = "setParam"
    SET_CONC = "setConc"
    CLAMP_CONC = "clampConc"


class Sim:
    def prepare_tmp_dir(self):
        self.tmp_dir = tempfile.mkdtemp()
        os.chdir(self.tmp_dir)

    def rm_tmp_dir(self):
        shutil.rmtree(self.tmp_dir)
