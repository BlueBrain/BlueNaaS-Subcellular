// TODO: split into different files

const ServerMessageType = {
  SIM_TRACE: 'simTrace',
  SIM_STEP_TRACE: 'simStepTrace',
  SIM_STATUS: 'simStatus',
}

export const SIM_TRACE_MAX_SIZE = 10e6

const EntityType = {
  STRUCTURE_TYPE: 'structureType',
  STRUCTURE: 'structure',
  PARAMETER: 'parameter',
  FUNCTION: 'function',
  MOLECULE: 'molecule',
  SPECIES: 'species',
  REACTION: 'reaction',
  OBSERVABLE: 'observable',
  DIFFUSION: 'diffusion',
  GEOMETRY: 'geometry',
}

const StructureType = {
  COMPARTMENT: 'compartment',
  MEMBRANE: 'membrane',
}

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

const defaultEmptyModel = {
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

const defaultEmptyRevision = {
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

const defaultSolverConfig = {
  [SimSolver.STEPS]: {
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
  [SimSolver.NFSIM]: {
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
  EntityType,
  StructureType,
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
