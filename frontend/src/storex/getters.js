
import constants from '@/constants';

const { SimSolver } = constants;

class SolverState {
  /**
   * Create solverState instance
   *
   * @param {Boolean} enabled
   * @param {Str} reason
   */
  constructor(enabled, reason = '') {
    this.enabled = enabled;
    this.reason = reason;
  }
}

function getStepsSolverState(state) {
  if (!state.model.geometry) {
    return new SolverState(false, 'No geometry provided');
  }

  return new SolverState(true);
}

function getNfsimSolverState() {
  return new SolverState(true);
}

export default {
  solverState: state => (solver) => {
    if (solver === SimSolver.NFSIM) return getNfsimSolverState(state);
    if (solver === SimSolver.STEPS) return getStepsSolverState(state);

    throw new Error(`Unrecognised solver ${solver}`);
  },
};
