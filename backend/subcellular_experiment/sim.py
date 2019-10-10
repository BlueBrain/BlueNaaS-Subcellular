
import os
import tempfile
import shutil


STIMULUS_TYPE_BY_CODE = {
    0: 'setParam',
    1: 'setConc',
    2: 'clampConc',
}

def decompress_stimulation(stimulation):
    stimuli = []
    for idx in range(stimulation['size']):
        t = stimulation['data'][idx * 4]
        stim_type = STIMULUS_TYPE_BY_CODE[stimulation['data'][idx * 4 + 1]]
        target = stimulation['targetValues'][stimulation['data'][idx * 4 + 2]]
        value = stimulation['data'][idx * 4 + 3]
        stimuli.append({
            't': t,
            'type': stim_type,
            'target': target,
            'value': value
        })

    return stimuli


class TraceTarget:
    OBSERVABLE = 'observable'
    SPECIES = 'species'
    TET = 'tet'

class SimTraceMeta:
    TYPE = 'simTraceMeta'

    def __init__(self, trace_target, n_steps, observables=[], species=[], structures=[]):
        self.type = self.TYPE
        self.trace_target = trace_target
        self.n_steps = n_steps
        self.observables = observables
        self.species = species
        self.structures = structures

    def to_dict(self):
        return {
            'traceTarget': self.trace_target,
            'nSteps': self.n_steps,
            'observables': self.observables,
            'species': self.species,
            'structures': self.structures
        }


class SimStepTrace:
    TYPE = 'simStepTrace'

    def __init__(self, t, step_idx, values):
        self.type = self.TYPE
        self.t = t
        self.step_idx = step_idx
        self.values = values

    def to_dict(self):
        return {
            't': self.t,
            'stepIdx': self.step_idx,
            'values': self.values
        }


class SimTrace:
    TYPE = 'simTrace'

    def __init__(self, trace_target, times, values, observables=[], species=[], structures=[], log=None):
        self.type = self.TYPE
        self.trace_target = trace_target
        self.n_steps = len(times)
        self.times = times
        self.values = values
        self.observables = observables
        self.species = species
        self.structures = structures
        self.log = log

    def to_dict(self):
        return {
            'traceTarget': self.trace_target,
            'nSteps': self.n_steps,
            'times': self.times,
            'values': self.values,
            'observables': self.observables,
            'species': self.species,
            'log': self.log
        }


class SimStatus:
    QUEUED = 'queued'
    INIT = 'init'
    STARTED = 'started'
    ERROR = 'error'
    FINISHED = 'finished'
    CANCELLED = 'cancelled'

    TYPE = 'simStatus'

    def __init__(self, status, description=None, log=None):
        self.type = self.TYPE
        self.status = status
        self.description = description
        self.log = log

    def to_dict(self):
        return {
            'status': self.status,
            'description': self.description,
            'log': self.log
        }

class StimulusType:
    SET_PARAM = 'setParam'
    SET_CONC = 'setConc'
    CLAMP_CONC = 'clampConc'

class Sim:
    def prepare_tmp_dir(self):
        self.tmp_dir = tempfile.mkdtemp()
        os.chdir(self.tmp_dir)

    def rm_tmp_dir(self):
        shutil.rmtree(self.tmp_dir)
