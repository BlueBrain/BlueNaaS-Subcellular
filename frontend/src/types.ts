export interface User {
  id: string
}

export interface Simulation {
  solver: 'steps' | 'NFsim'
}

export type Solver = 'nfsim' | 'tetexact' | 'tetopsplit' | 'ode' | 'ssa'

export interface ModelBase {
  name: string
  annotation: string
  id: number
  user_id: string
}

export interface Parameter {
  id: number
  name: string
  annotation: string
  definition: string
  model_id: number
}

export interface Function {
  id: number
  name: string
  annotation: string
  definition: string
  model_id: number
}

export interface Molecule {
  id: number
  name: string
  annotation: string
  definition: string
  model_id: number
}

export interface Species {
  id: number
  name: string
  annotation: string
  definition: string
  concentration: number
  model_id: number
}

export interface Observable {
  id: number
  name: string
  annotation: string
  definition: string
  model_id: number
}

export interface Diffusion {
  id: number
  name: string
  species_definition: string
  diffusion_constant: number
  compartment: string
  annotation: string
  model_id: number
}

export interface Reaction {
  id: number
  name: string
  definition: string
  annotation: string
  kf: string
  kr: string
  model_id: number
}

export interface StructureBase {
  id: number
  name: string
  type: 'membrane' | 'compartment'
  annotation: string
  model_id: number
}

export interface Model {
  simulations: Simulation[]
}

export interface State {
  model: Model
  simTraces: {
    [simId: string]: {
      latestIndex: number
      simTrace: SimTrace
    }
  }
}

export interface SimStepTrace {
  stepIdx: number
  t: number
  observables: string[]
  userId: string
  values: number[]
}

export interface SimTrace {
  TYPE: 'simTrace'
  simId: string
  index: number
  times: number[]
  values_by_observable: { [observable: string]: number[] } //eslint-disable-line
}

export interface Structure {
  name: string
  type: 'compartment' | 'membrane'
  size: string
  parentName: string
  annotation: string
  entityId: string
}
