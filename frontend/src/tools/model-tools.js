
import sup from 'superscript-text';

import constants from '@/constants';


const { StructureType } = constants;


function createSimulationTemplate(simulation) {
  const simCleanupDefaults = {
    status: constants.SimStatus.CREATED,
    currentStepIdx: null,
    observables: null,
    species: null,
    nSteps: null,
    traceTarget: null,
    times: [],
    values: [],
    log: null,
    userId: null,
    id: null,
    _id: null,
  };
  return Object.assign({...simulation}, simCleanupDefaults);
}

function getEntityStructName(def) {
  const nameMatch = def.match(/@(\w*)/);
  return nameMatch ? nameMatch[1] : '';
}

function getDefaultSpecUnit(model, specDef) {
  const structName = getEntityStructName(specDef);
  if (!structName) return '';

  const structure = model.structures.find(s => s.name === structName);
  if (!structure) return '';

  const unit = {
    str: structure.type === StructureType.COMPARTMENT ? 'M' : '#',
  };

  return unit;
}

/**
 * @param {Object} model
 * @param {String} reacSideDef
 */
function getDefaultKineticRateUnit(model, reacSideDef) {
  const reactants = reacSideDef
    .replace(/\!\+/, '!_') // to avoid splitting by component attributes like `CaM(x!+)`
    .split('+')
    .map(reactantStr => reactantStr.trim());

  const structNames = reactants.map(reactant => getEntityStructName(reactant));
  const structTypes = structNames.map((structName) => {
    const structure = model.structures.find(s => s.name === structName);
    return structure ? structure.type : null;
  });

  const ambiguous = structTypes.some(type => !type);

  const nComps = structTypes
    .reduce((acc, type) => acc + Number(type !== StructureType.MEMBRANE), 0);

  const unitPow = 1 - nComps;

    const unit = {
    ambiguous,
    str: `${unitPow ? `M${sup(unitPow.toString())}` : ''}s${sup('-1')}`,
  };

  return unit;
}

function getDefaultForwardKineticRateUnit(model, reacDef) {
  const reacLHS = reacDef.match(/(.*?)<?->/)[1];
  return getDefaultKineticRateUnit(model, reacLHS);
}

function getDefaultBackwardKineticRateUnit(model, reacDef) {
  const reacRHS = reacDef.match(/<?->(.*?)/)[1];
  return getDefaultKineticRateUnit(model, reacRHS);
}

function getMatches(string, regex, index = 1) {
  const matches = [];
  let match = regex.exec(string);
  while (match) {
    matches.push(match[index]);
    match = regex.exec(string);
  }
  return matches;
}

function parseStimuliRnf(fileContent) {
  const actionR = /(?:^|\r?\n)(?:\s*)((?:set|sim)(.*))(?:\r?\n|$)/gm;
  const actionStrings = getMatches(fileContent, actionR);

  const actionToStimMap = {
    set: 'setParam',
  };

  let time = 0;
  const stimuli = actionStrings
    .map((actionString) => {
      const [action, param1, param2] = actionString.split(/\s+/);
      const stimulus = {
        t: time,
        type: actionToStimMap[action],
        target: param1,
        value: param2,
      };

      if (action === 'sim') {
        time += parseFloat(param1);
      }

      return stimulus;
    })
    .filter(stimulus => stimulus.type);

  return stimuli;
}

function parseStimuliTsv(fileContent) {
  return fileContent
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line)
    .map((stimStr) => {
      const [t, type, target, value] = stimStr.trim().split(/\t/);
      return {
        t,
        type,
        target,
        value,
      };
    });
}

/**
 * Parse stimuli file and return model representation of it
 * @param {String} type Format of stimuli input source, can be `rnf` or `tsv`
 * @param {String} fileContent String to parse
 */
function parseStimuli(type, fileContent) {
  const parser = {
    rnf: parseStimuliRnf,
    tsv: parseStimuliTsv,
  };

  if (!parser[type]) {
    throw new Error(`Unknown stimuli format ${type}`);
  }

  return parser[type](fileContent);
}

const bnglDefNameR = /(\w+)\(/;
const bnglDefStructureR = /@(\w+)/;

function getDefName(bnglDefinition) {
  if (!bnglDefinition) return;

  const match = bnglDefinition.match(bnglDefNameR);
  return match && match[1];
};

function getDefStructure(bnglDefinition) {
  if (!bnglDefinition) return;

  const match = bnglDefinition.match(bnglDefStructureR);
  return match && match[1];
}

/**
 * Match model molecule definition/species with a concentration data by given importConfig
 * and build a collection containing species and their old/new concentrations
 *
 * @param {Object} model See defaultModel in `@/src/constants`
 * @param {Object} importConfig
 * @param {String} importConfig.match.molecule.prop Molecule property used for matching
 * @param {String} importConfig.match.molecule.tableColumn Column used for matching of molecules
 * @param {Object[]} importConfig.match.structures Collection used to match structures,
 *                                                   has `prop` and `tableColumn` props
 * @param {Object[]} concentrationData             Parsed CSV/TSV with concentrations to import
 */
function buildConcImportCollection(model, importConfig, concentrationData) {
  const molConf = importConfig.match.molecule;

  const structureNameSet = new Set(importConfig.match.structures.map(s => s.name));

  const molMatchPropValueSet = new Set(model.molecules.map(m => m[molConf.prop]));
  const concDataRows = concentrationData
    .filter(row => molMatchPropValueSet.has(row[molConf.tableColumn]));

  const concImportCollBySpec = {};

  const processConcRow = (concRow) => {
    const molPropValue = concRow[molConf.tableColumn];
    const molecule = model.molecules.find(m => m[molConf.prop] === molPropValue);
    const molDefName = getDefName(molecule.definition);
    const species = model.species
      // filter out molecular complexes
      .filter(s => !s.definition.includes('.'))
      // filter matching molecule definition name
      .filter(s => getDefName(s.definition) === molDefName)
      // use species from structures defined in importConfig (present in concentration table)
      .filter(s => structureNameSet.has(getDefStructure(s.definition)));

    species.forEach((spec) => {
      const defName = getDefName(spec.definition);
      const structureName = getDefStructure(spec.definition);

      const specKey = `${defName}@${structureName}`;

      if (!concImportCollBySpec[specKey]) {
        concImportCollBySpec[specKey] = {
          species: [],
          newConcentrations: [],
          specIdx: 0,
          newConcentrationIdx: 0,
        };
      }

      if (!concImportCollBySpec[specKey].species.includes(spec)) {
        concImportCollBySpec[specKey].species.push(spec);
      }

      const concTableColumn = importConfig.match.structures
        .find(s => s.name === structureName).tableColumn;

      const newConc = concRow[concTableColumn];
      if (!concImportCollBySpec[specKey].newConcentrations.includes(newConc)) {
        concImportCollBySpec[specKey].newConcentrations.push(newConc);
      }
    });
  };

  concDataRows.forEach(processConcRow);

  return Object.values(concImportCollBySpec);
}

export default {
  getDefaultSpecUnit,
  getDefaultForwardKineticRateUnit,
  getDefaultBackwardKineticRateUnit,
  parseStimuli,
  createSimulationTemplate,
  buildConcImportCollection,
};
