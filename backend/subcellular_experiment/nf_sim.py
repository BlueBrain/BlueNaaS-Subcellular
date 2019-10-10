
import os
import subprocess
import math

import numpy as np
import pandas as pd

from .sim import SimStatus, SimTrace,SimTraceMeta, SimStepTrace, TraceTarget, SimLog, Sim, StimulusType, decompress_stimulation
from .bngl_extended_model import BnglExtModel
from .logger import get_logger


L = get_logger(__name__)

BNG_MODEL_EXPORT_TIMEOUT = 5
BNG_PATH = '/opt/subcellular-experiment/BioNetGen/BNG2.pl'
NFSIM_PATH = '/opt/subcellular-experiment/BioNetGen/bin/NFsim'


class NfSim(Sim):
    def __init__(self, sim_config):
        self.sim_config = sim_config
        self.prepare_tmp_dir()

    def generate_rnf(self):
        solver_conf = self.sim_config['solverConf']
        stimuli = decompress_stimulation(solver_conf['stimulation'])
        t_end = solver_conf['tEnd']
        dt = solver_conf['dt']
        next_step_dt = None

        rnf_actions = []

        action_t_vec = list(set(
            [stim['t'] for stim in stimuli if stim['t'] < t_end] +
            [0, t_end]
        ))
        action_t_vec.sort()
        t = 0
        for action_t in action_t_vec:
            delta_t = action_t - t
            if delta_t != 0:
                n_steps = math.ceil(delta_t / (next_step_dt or dt))
                sim_action = '  sim {} {}'.format(delta_t, n_steps)
                rnf_actions.append(sim_action)
            actions = [action for action in stimuli if action['t'] == action_t]
            for action in actions:
                rnf_action = None
                if action['type'] == StimulusType.SET_PARAM:
                    rnf_action = '  set {} {}'.format(action['target'], action['value'])
                else:
                    raise ValueError('Unknown stimulus type {}'.format(action['type']))
                rnf_actions.append(rnf_action)
                next_step_dt = action.get('dt', None)
            if len(actions) > 0:
                rnf_actions.append('  update')
            t = action_t

        rnf = '\n'.join([
            '-xml model.xml',
            '-v',
            '-utl 3',
            '-o model.gdat',
            '',
            'begin',
            '\n'.join(rnf_actions),
            'end'
        ])

        return rnf

    def run(self):
        log = {}

        bngl_ext_model = BnglExtModel(self.sim_config['model'])
        bngl_str = bngl_ext_model.to_bngl(write_xml_op=True)

        rnf_str = self.generate_rnf()
        log['rnf'] = rnf_str

        L.debug(rnf_str)
        with open('model.bngl', 'w') as model_file:
            model_file.write(bngl_str)
        with open('model.rnf', 'w') as rnf_file:
            rnf_file.write(rnf_str)

        L.debug('starting BNG xml model export')
        try:
            bng_run = subprocess.run(
                [BNG_PATH, 'model.bngl'],
                check=False,
                capture_output=True,
                timeout=BNG_MODEL_EXPORT_TIMEOUT
            )
        except subprocess.TimeoutExpired:
            log['system'] = 'BNGL was not been able to convert a model into xml within 5 seconds'
            yield SimStatus(SimStatus.ERROR, log=log)
            return

        log['bng_stdout'] = bng_run.stdout.decode('utf-8')
        log['bng_stderr'] = bng_run.stderr.decode('utf-8')
        if bng_run.returncode is not 0:
            yield SimStatus(SimStatus.ERROR, log=log)
            return
        L.debug('BNG xml model export has been finished')

        L.debug('starting NFsim')
        nfsim_run = subprocess.run(
            [NFSIM_PATH, '-csv', '-logo', '-rnf', 'model.rnf'],
            check=False,
            capture_output=True
        )
        log['nfsim_stdout'] = nfsim_run.stdout.decode('utf-8')
        log['nfsim_stderr'] = nfsim_run.stderr.decode('utf-8')

        L.debug('NFsim return code is {}'.format(nfsim_run.returncode))
        if nfsim_run.returncode is not 0:
            yield SimStatus(SimStatus.ERROR, log=log)
            return

        if not os.path.isfile('model.gdat'):
            log['system'] = 'NFsim hasn\t generated model.gdat, check the logs for more information'
            yield SimStatus(SimStatus.ERROR, log=log)
            return

        sim_traces = pd.read_csv('model.gdat')
        observables = [{'name': col} for col in sim_traces.columns.tolist()[1:]]
        times = np.array(sim_traces.values.tolist())[:,0]
        values = np.array(sim_traces.values.tolist())[:,1:]

        yield SimTrace(TraceTarget.OBSERVABLE,
                       times,
                       values,
                       observables=observables,
                       log=log)

        yield SimStatus(SimStatus.FINISHED)

        self.rm_tmp_dir()
