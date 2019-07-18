
import sup from 'superscript-text';

import constants from '@/constants';


const { StructureType } = constants;


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

export default {
  getDefaultSpecUnit,
  getDefaultForwardKineticRateUnit,
  getDefaultBackwardKineticRateUnit,
  parseStimuli,
};
