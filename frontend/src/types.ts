export interface Simulation {
  solver: 'steps' | 'NFsim';
}

export interface Model {
  simulations: Simulation[];
}

export interface State {
  model: Model;
  simTraces: {
    [simId: string]: {
      latestIndex: number;
      simTrace: SimTrace;
    };
  };
}

export interface SimStepTrace {
  stepIdx: number;
  t: number;
  observables: string[];
  userId: string;
  values: number[];
}

export interface SimTrace {
  TYPE: 'simTrace';
  simId: string;
  index: number;
  times: number[];
  values_by_observable: { [observable: string]: number[] };
}