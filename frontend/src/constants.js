
const ServerMessageType = {
  SIM_TRACE_META: 'simTraceMeta',
  SIM_TRACE: 'simTrace',
  SIM_STEP_TRACE: 'simStepTrace',
  SIM_STATUS: 'simStatus',
};

const EntityType = {
  STRUCTURE: 'structure',
  PARAMETER: 'parameter',
  FUNCTION: 'function',
  MOLECULE: 'molecule',
  SPECIES: 'species',
  REACTION: 'reaction',
  OBSERVABLE: 'observable',
  DIFFUSION: 'diffusion',
  GEOMETRY: 'geometry',
};

const StructureType = {
  COMPARTMENT: 'compartment',
  MEMBRANE: 'membrane',
};

const ModelExportFormats = {
  BNGL: 'bngl',
  PYSB_FLAT: 'pysb_flat',
  SBML: 'sbml',
  STEPS: 'steps',
};

const ModelFormatExtensions = {
  bngl: 'bngl',
  pysb_flat: 'py',
  sbml: 'sbml',
  steps: 'py',
};

const SimStatus = {
  CREATED: 'created',
  READY_TO_RUN: 'readyToRun',
  QUEUED: 'queued',
  STARTED: 'started',
  CANCELLED: 'cancelled',
  ERROR: 'error',
  FINISHED: 'finished',
};

const UnitType = {
  VOL_SIZE: 'volSize',
  SURF_SIZE: 'surfSize',
  VOL_REAC_RATE: 'volReacRate',
  SURF_REAC_RATE: 'surfReacRate',
  TIME: 'time',
  OTHER: 'other',
};

const units = [{
  val: 'm³',
  type: UnitType.volSize,
}, {
  val: 'm²',
  type: UnitType.surfSize,
}, {
  val: 'm³.s⁻¹',
  type: UnitType.volReacRate,
}, {
  val: 'm².s⁻¹',
  type: UnitType.surfReacRate,
}, {
  val: 's',
  type: UnitType.time,
}, {
  val: 'item',
  type: UnitType.other,
}, {
  val: 'other',
  type: UnitType.other,
}];

const SimSolver = {
  NFSIM: 'nfsim',
  STEPS: 'steps',
};

const StimulusTypeEnum = {
  SET_PARAM: 'setParam',
  SET_CONC: 'setConc',
  CLAMP_CONC: 'clampConc',
};

const defaultEmptyModel = {
  id: null,
  name: '',
  annotation: '',
  nonBnglStructures: false,

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
};

const DefaultSolverConfig = {
  [SimSolver.STEPS]: {
    dt: 0.02,
    tEnd: 20,
    stimuli: [],
  },
  [SimSolver.NFSIM]: {
    nSteps: 200,
    tEnd: 20,
    stimuli: [],
  },
};

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
  DefaultSolverConfig,
  StimulusTypeEnum,
  ServerMessageType,
};
