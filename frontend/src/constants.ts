// TODO most constants here can be replaced by Typescript's literal types,
export const PUBLIC_USER_ID = '68b8868e-11b4-49f3-93ff-e27b2197ddcc'

const ServerMessageType = {
  SIM_TRACE: 'simTrace',
  SIM_STEP_TRACE: 'simStepTrace',
  SIM_STATUS: 'simStatus',
}

export const SIM_TRACE_MAX_SIZE = 10e6

const ModelExportFormats = {
  BNGL: 'bngl',
  PYSB_FLAT: 'pysb_flat',
  SBML: 'sbml',
  STEPS: 'steps',
}

const ModelFormatExtensions = {
  bngl: 'bngl',
  ebngl: 'ebngl',
  pysb_flat: 'py',
  sbml: 'sbml',
  steps: 'py',
}

const SimStatus = {
  CREATED: 'created',
  READY_TO_RUN: 'readyToRun',
  INIT: 'init',
  QUEUED: 'queued',
  STARTED: 'started',
  CANCELLED: 'cancelled',
  ERROR: 'error',
  FINISHED: 'finished',
}

const UnitType = {
  VOL_SIZE: 'volSize',
  SURF_SIZE: 'surfSize',
  VOL_REAC_RATE: 'volReacRate',
  SURF_REAC_RATE: 'surfReacRate',
  TIME: 'time',
}

const units = [
  {
    val: 'm³',
    type: UnitType.VOL_SIZE,
  },
  {
    val: 'm²',
    type: UnitType.SURF_SIZE,
  },
  {
    val: 'm³.s⁻¹',
    type: UnitType.VOL_REAC_RATE,
  },
  {
    val: 'm².s⁻¹',
    type: UnitType.SURF_REAC_RATE,
  },
  {
    val: 's',
    type: UnitType.TIME,
  },
]

const SimSolver = {
  NFSIM: 'nfsim',
  STEPS: 'steps',
}

const StimulusTypeEnum = {
  SET_PARAM: 'setParam',
  SET_CONC: 'setConc',
  CLAMP_CONC: 'clampConc',
}

interface Model {
  id: string | null
  name: string
  annotation: string
  structures: any[]
  parameters: any[]
  functions: any[]
  molecules: any[]
  species: any[]
  observables: any[]
  reactions: any[]
  diffusions: any[]
  geometry: null
  simulations: any[]
}

const defaultEmptyModel: Model = {
  id: null,
  name: '',
  annotation: '',

  structures: [],
  parameters: [],
  functions: [],
  molecules: [],
  species: [],
  observables: [],
  reactions: [],
  diffusions: [],

  geometry: null,
  simulations: [],
}

type Revision = {
  name: string
  description: string
  branch: string
  loading: boolean
  config: {
    concSources: string[]
    visibleConcSources: string[]
  }
  structures: any[]
  parameters: any[]
  functions: any[]
  molecules: any[]
  species: any[]
  observables: any[]
  reactions: any[]
  diffusions: any[]
}

const defaultEmptyRevision: Revision = {
  name: '',
  description: '',
  branch: '',
  loading: false,
  config: {
    concSources: ['default'],
    visibleConcSources: ['default'],
  },

  structures: [],
  parameters: [],
  functions: [],
  molecules: [],
  species: [],
  observables: [],
  reactions: [],
  diffusions: [],
}

interface StepsSolverConfig {
  dt: number
  tEnd: number
  stimulation: {
    size: number
    targetValues: number[]
    data: any[]
  }
  spatialSampling: {
    enabled: boolean
    structures: any[]
    observables: any[]
  }
}

type NfsimSolverConfig = Omit<StepsSolverConfig, 'spatialSampling'>

interface SolverConfigs {
  [solver: string]: StepsSolverConfig | NfsimSolverConfig
}

const defaultSolverConfig: SolverConfigs = {
  tetexact: {
    dt: 0.01,
    tEnd: 10,
    stimulation: {
      size: 0,
      targetValues: [],
      data: [],
    },
    spatialSampling: {
      enabled: false,
      structures: [],
      observables: [],
    },
  },
  tetopsplit: {
    dt: 0.01,
    tEnd: 10,
    stimulation: {
      size: 0,
      targetValues: [],
      data: [],
    },
    spatialSampling: {
      enabled: false,
      structures: [],
      observables: [],
    },
  },
  nfsim: {
    dt: 0.01,
    tEnd: 10,
    stimulation: {
      size: 0,
      targetValues: [],
      data: [],
    },
  },
}

const entityTypeCollectionMap = {
  parameter: 'parameters',
  function: 'functions',
  structure: 'structures',
  molecule: 'molecules',
  species: 'species',
  reaction: 'reactions',
  observable: 'observables',
  simulation: 'simulations',
  diffusion: 'diffusions',
}

const formMode = {
  CREATE_NEW: 'createNew',
  EDIT: 'edit',
}

const agentType = {
  ION: 'ion',
  PROTEIN: 'protein',
  PROTEIN_FAMILY: 'protein family',
  PROTEIN_MULTIMER: 'protein multimer',
  METABOLITE: 'metabolite',
}

const validationMessageType = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
}

const DEFAULT_VISIBLE_CONC_N_PER_REV = 5

export default {
  SimStatus,
  SimSolver,
  units,
  UnitType,
  ModelExportFormats,
  ModelFormatExtensions,
  defaultEmptyModel,
  defaultEmptyRevision,
  defaultSolverConfig,
  StimulusTypeEnum,
  ServerMessageType,
  entityTypeCollectionMap,
  formMode,
  agentType,
  validationMessageType,
  SIM_TRACE_MAX_SIZE,
  DEFAULT_VISIBLE_CONC_N_PER_REV,
}
