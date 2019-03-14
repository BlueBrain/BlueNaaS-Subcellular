
import intersection from 'lodash/intersection';
import uniq from 'lodash/uniq';
import difference from 'lodash/difference';
import sortBy from 'lodash/sortBy';
import words from 'lodash/words';
import cloneDeep from 'lodash/cloneDeep';
import uuidv4 from 'uuid/v4';

import agents from '@/data/agents.json';
import rules from '@/data/rules.json';
import reactionRates from '@/data/reac-rates';
import constants from '@/constants';


const defaultStructures = {
  presyn: { name: 'presyn', type: 'compartment', size: 'presyn_v', parentName: 'pm', annotation: '' },
  psd: { name: 'psd', type: 'compartment', size: 'psd_v', parentName: 'pm', annotation: '' },
  cyt: { name: 'cyt', type: 'compartment', size: 'cyt_v', parentName: 'pm', annotation: '' },
  nuc: { name: 'nuc', type: 'compartment', size: 'nuc_v', parentName: '', annotation: '' },
  er: { name: 'er', type: 'compartment', size: 'er_v', parentName: '', annotation: '' },
  end: { name: 'end', type: 'compartment', size: 'end_v', parentName: '', annotation: '' },
  golgi: { name: 'golgi', type: 'compartment', size: 'golgi_v', parentName: '', annotation: '' },
  lys: { name: 'lys', type: 'compartment', size: 'lys_v', parentName: '', annotation: '' },
  mito: { name: 'mito', type: 'compartment', size: 'mito_v', parentName: '', annotation: '' },
  per: { name: 'per', type: 'compartment', size: 'per_v', parentName: '', annotation: '' },
  pm: { name: 'pm', type: 'membrane', size: 'pm_s', parentName: '-', annotation: '' },
};


function buildFromProteins(proteins) {
  const model = {
    structures: [],
    parameters: [],
    functions: [],
    molecules: [],
    species: [],
    observables: [],
    reactions: [],
  };

  const modelAgentMap = new Map();

  proteins.forEach((protein) => {
    // skip protein matching if there is no geneNames property
    if (!protein.geneNames) return;

    const currentAgent = agents.find((agent) => {
      const proteinUniprotIds = protein.uniprotIds.split(',').filter(id => id);
      const proteinGeneNames = protein.geneNames.split(',').filter(geneName => geneName);
      const agentUniprotIds = agent.uniprotIds.split(',').filter(id => id);
      const agentGeneNames = agent.geneNames.split(',').filter(geneName => geneName);

      return intersection(proteinUniprotIds, agentUniprotIds).length || intersection(proteinGeneNames, agentGeneNames).length;
    });

    if (!currentAgent) return;

    const conc = Object.keys(protein.conc).reduce((acc, location) => {
      const concValue = protein.conc[location].val;
      return concValue ? Object.assign(acc, { [location]: concValue }) : acc;
    }, {});

    modelAgentMap.set(currentAgent.bioNetGenDef, Object.assign({ conc: {} }, currentAgent, { conc }));
  });

  const modelMoleculeNames = [];
  const modelStructures = new Map();

  modelAgentMap.forEach((agent, agentDefinition) => {
    const moleculeName = agentDefinition.match(/(\w+)\(/)[1];
    modelMoleculeNames.push(moleculeName);
    // addding molecule definition

    model.molecules.push({
      name: moleculeName,
      definition: agentDefinition,
      annotation: agent.description,
    });

    // adding species, TODO: use abundance to produce different states of molecules
    let speciesDefinition = agentDefinition;
    const stateLabelsR = /((?:~\w+){2,})/;
    while (stateLabelsR.test(speciesDefinition)) {
      const componentLabels = speciesDefinition.match(stateLabelsR)[1];
      const initialLabel = componentLabels.match(/~\w+/);
      speciesDefinition = speciesDefinition.replace(componentLabels, initialLabel);
    }

    Object.keys(agent.conc).forEach((location) => {
      model.species.push({
        name: `${location}_${moleculeName}`,
        definition: `@${location}:${speciesDefinition}`,
        concentration: agent.conc[location].toString(),
        annotation: '',
      });

      // collect structures used in the model
      modelStructures.set(location, defaultStructures[location]);
      let parentLocation = defaultStructures[location].parentName === '-' ? null : defaultStructures[location].parentName;
      while (parentLocation) {
        modelStructures.set(parentLocation, defaultStructures[parentLocation]);
        parentLocation = defaultStructures[parentLocation].parentName === '-' ? null : defaultStructures[parentLocation].parentName;
      }
    });
  });

  // adding structures to the model
  modelStructures.forEach(structure => model.structures.push(structure));
  model.structures = sortBy(model.structures, o => o.parentName);

  // adding reaction rules
  const ruleReactantR = /(\w+)\(.*?\)/g;
  const modelRules = rules.filter((rule) => {
    const ruleReactants = rule.bioNetGenDef.match(ruleReactantR);
    const moleculeNameR = /(\w+)\(/;
    const ruleMoleculeNames = uniq(ruleReactants.map(reactant => reactant.match(moleculeNameR)[1]));

    return !difference(ruleMoleculeNames, modelMoleculeNames).length;
  });

  let reactionNameIndex = 0;
  const reactionDefinitionR = /(.*)\s+\w+,\s*\w+/;
  // TODO: check if reaction is one way only
  const reactionKfR = /.*\s+(\w+),\s*\w+/;
  const reactionKrR = /.*\s+\w+,\s*(\w+)/;
  modelRules.forEach((modelRule) => {
    const kf = modelRule.bioNetGenDef.match(reactionKfR)[1];
    const kr = modelRule.bioNetGenDef.match(reactionKrR)[1];


    // adding reaction rates as params as well

    model.parameters.push({
      name: kf,
      definition: reactionRates[kf],
      annotation: '',
    });

    model.parameters.push({
      name: kr,
      definition: reactionRates[kr],
      annotation: '',
    });

    model.reactions.push({
      name: modelRule.name || `r${reactionNameIndex += 1}`,
      definition: modelRule.bioNetGenDef.match(reactionDefinitionR)[1],
      kf,
      kr,
      annotation: modelRule.description,
    });
  });

  return model;
}

function buildFromBngl(fileContent) {
  const newLineR = /\r\n|\r|\n/;

    const model = Object.assign({ id: uuidv4(), name: '' }, cloneDeep(constants.defaultEmptyModel));

    const sPartsToStructure = sParts => ({
      name: sParts[0],
      type: sParts[1] === '3' ? constants.StructureType.COMPARTMENT : constants.StructureType.MEMBRANE,
      size: sParts[2],
      parentName: sParts[3] ? sParts[3] : '-',
      annotation: '',
    });

    const pPartsToParameter = pParts => ({
      name: pParts[0],
      definition: pParts.slice(1).join(' '),
      annotation: '',
    });

    const lineToFunction = line => ({
      name: line.match(/(.*)\(\)/)[1],
      definition: line.match(/(.*)\(\)(.*)/)[2].trim(),
      annotation: '',
    });

    const mPartsToMolecule = mParts => ({
      name: mParts[0].match(/(.*)\(/)[1],
      definition: mParts[0],
      annotation: '',
    });

    const partsToSpecies = (parts) => {
      return {
        name: words(parts[0].match(/(.*)(\(?|$)/)[1]).join('_'),
        definition: parts[0],
        concentration: parts[1],
        annotation: '',
      };
    };

    const lineToReaction = (line) => {
      const bidirectional = line.includes('<->');

      const reactionR = bidirectional
        ? /^(\w*?)\s?:?\s*(.*)\s+(\S+)\s*,\s*(\S+)#?(.*?)$/
        : /^(\w*?)\s?:?\s*(.*)\s+(\S+)#?(.*?)$/;

      const reactionMatch = line.match(reactionR);

      const reaction = {
        name: reactionMatch[1] || '-',
        definition: reactionMatch[2],
        kf: reactionMatch[3],
        kr: bidirectional ? reactionMatch[4] : '',
        annotation: bidirectional ? reactionMatch[5] : reactionMatch[4],
      };

      return reaction;
    };

    const partsToObservable = parts => ({
      name: parts[1],
      definition: parts[2],
      annotation: '',
    });

    const structuresR = /begin compartments(.*)end compartments/s;
    const parametersR = /begin parameters(.*)end parameters/s;
    const functionsR = /begin functions(.*)end functions/s;
    const moleculesR = /begin molecule types(.*)end molecule types/s;
    const speciesR = /begin\s*\w*\s*species\s*\n(.*)end\s*\w*\s*species/s;
    const reactionsR = /begin reaction rules(.*)end reaction rules/s;
    const observablesR = /begin observables(.*)end observables/s;

    if (structuresR.test(fileContent)) {
      model.structures = fileContent
        .match(structuresR)[1]
        .split(newLineR)
        .filter(s => s)
        .map(s => s.trim())
        .filter(s => !s.startsWith('#'))
        .map(p => p.match(/[^#]*/)[0])
        .map(p => p.trim())
        .map(s => s.split(/\t|\s/).filter(p => p))
        .map(sPartsToStructure);
    }

    if (parametersR.test(fileContent)) {
      model.parameters = fileContent
        .match(parametersR)[1]
        .split(newLineR)
        .filter(p => p)
        .map(p => p.trim())
        .filter(p => !p.startsWith('#'))
        .map(p => p.match(/[^#]*/)[0])
        .map(p => p.trim())
        .filter(p => p)
        .map(p => p.split(/\t|\s/).filter(p => p))
        .map(pPartsToParameter);
    }

    if (functionsR.test(fileContent)) {
      model.functions = fileContent
        .match(functionsR)[1]
        .split(newLineR)
        .map(f => f.trim())
        .filter(f => f)
        .filter(f => !f.startsWith('#'))
        .map(p => p.match(/[^#]*/)[0])
        .map(p => p.trim())
        .map(lineToFunction);
    }

    model.molecules = fileContent
      .match(moleculesR)[1]
      .split(newLineR)
      .filter(m => m)
      .map(m => m.trim())
      .filter(m => !m.startsWith('#'))
      .map(p => p.match(/[^#]*/)[0])
      .map(p => p.trim())
      .map(m => m.split(/\t|\s/).filter(p => p))
      .map(mPartsToMolecule);

    if (speciesR.test(fileContent)) {
      model.species = fileContent
        .match(speciesR)[1]
        .split(newLineR)
        .map(s => s.trim())
        .filter(s => s)
        .filter(s => !s.startsWith('#'))
        .map(p => p.match(/[^#]*/)[0])
        .map(p => p.trim())
        .map(s => s.split(/\t|\s/).filter(p => p))
        .map(partsToSpecies);
    }

    if (observablesR.test(fileContent)) {
      model.observables = fileContent
        .match(observablesR)[1]
        .split(newLineR)
        .filter(o => o)
        .map(o => o.trim())
        .filter(o => !o.startsWith('#'))
        .map(p => p.match(/[^#]*/)[0])
        .map(p => p.trim())
        .map(o => o.split(/\t|\s/).filter(p => p))
        .map(partsToObservable);
    }

    model.reactions = fileContent
      .match(reactionsR)[1]
      .split(newLineR)
      .map(r => r.trim())
      .filter(r => !r.startsWith('#'))
      .filter(r => r)
      .map(p => p.match(/[^#]*/)[0])
      .map(p => p.trim())
      .map(lineToReaction);

    return model;
}


export default {
  buildFromProteins,
  buildFromBngl,
};
