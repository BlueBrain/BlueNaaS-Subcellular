
import words from 'lodash/words';
import cloneDeep from 'lodash/cloneDeep';
import uuidv4 from 'uuid/v4';

import constants from '@/constants';
import modelTools from '@/tools/model-tools';


function buildFromBngl(fileContent) {
  const newLineR = /\r\n|\r|\n/;

    const model = Object.assign(cloneDeep(constants.defaultEmptyModel), { id: uuidv4() });

    const sPartsToStructure = sParts => ({
      name: sParts[0],
      type: sParts[1] === '3' ? constants.StructureType.COMPARTMENT : constants.StructureType.MEMBRANE,
      size: sParts[2],
      parentName: sParts[3] ? sParts[3] : '-',
      annotation: '',
      entityId: uuidv4(),
    });

    const pPartsToParameter = pParts => ({
      name: pParts[0],
      definition: pParts.slice(1).join(' '),
      annotation: '',
      entityId: uuidv4(),
    });

    const lineToFunction = (line) => {
      const functionR = /(\w+)\((\w*)\)\s*=?\s*(.*)/;
      const functionMatch = line.match(functionR);

      const func = {
        name: functionMatch[1],
        argument: functionMatch[2],
        definition: functionMatch[3],
        annotation: '',
        entityId: uuidv4(),
      };

      return func;
    };

    const mPartsToMolecule = (mParts) => {
      const molecule = {
        name: mParts[0].match(/(.*)\(/)[1],
        definition: mParts[0],
        annotation: '',
        entityId: uuidv4(),
      };

      return molecule;
    };

    const partsToSpecies = (parts) => {
      const def = parts[0];

      return {
        name: words(parts[0].match(/(.*)(\(?|$)/)[1]).join('_'),
        definition: def,
        concentration: parts[1],
        unit: modelTools.getDefaultSpecUnit(model, def),
        annotation: '',
        entityId: uuidv4(),
      };
    };

    const lineToReaction = (line) => {
      const bidirectional = line.includes('<->');

      const reactionR = bidirectional
        ? /^((\w*)\s?:)?\s*(.*)\s+(\S+)\s*,\s*(\S+)#?(.*?)$/
        : /^((\w*)\s?:)?\s*(.*)\s+(\S+)#?(.*?)$/;

      const reactionMatch = line.match(reactionR);

      const reacDef = reactionMatch[3];

      const reaction = {
        name: reactionMatch[2] || '-',
        definition: reacDef,
        kf: reactionMatch[4],
        // kfUnit: modelTools.getDefaultForwardKineticRateUnit(model, reacDef),
        kr: bidirectional ? reactionMatch[5] : '',
        // krUnit: bidirectional ? modelTools.getDefaultBackwardKineticRateUnit(model, reacDef) : null,
        annotation: bidirectional ? reactionMatch[6] : reactionMatch[5],
        entityId: uuidv4(),
      };

      return reaction;
    };

    const partsToObservable = parts => ({
      name: parts[1],
      definition: parts[2],
      annotation: '',
      entityId: uuidv4(),
    });

    const partsToDiffusion = (parts) => {
      const specPrefixCompR = /^@(\w+):(\w+\(.*\))$/;
      const specSuffixCompR = /^(\w+\(.*\))@(\w+)$/;

      const definition = parts[1];
      const prefixNotation = specPrefixCompR.test(definition);
      const defParsed = definition.match(prefixNotation ? specPrefixCompR : specSuffixCompR);

      return {
        name: parts[0],
        speciesDefinition: defParsed[prefixNotation ? 2 : 1],
        compartment: defParsed[prefixNotation ? 1 : 2],
        diffusionConstant: parts[2],
        annotation: '',
        entityId: uuidv4(),
      };
    };

    const structuresR = /begin compartments(.*)end compartments/s;
    const parametersR = /begin parameters(.*)end parameters/s;
    const functionsR = /begin functions(.*)end functions/s;
    const moleculesR = /begin molecule types(.*)end molecule types/s;
    const speciesR = /begin\s*\w*\s*species\s*\n(.*)end\s*\w*\s*species/s;
    const reactionsR = /begin reaction rules(.*)end reaction rules/s;
    const observablesR = /begin observables(.*)end observables/s;
    const diffusionsR = /begin diffusions(.*)end diffusions/s;

    if (structuresR.test(fileContent)) {
      model.structures = fileContent
        .match(structuresR)[1]
        .split(newLineR)
        .map(s => s.trim())
        .filter(s => s)
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

    if (moleculesR.test(fileContent)) {
      model.molecules = fileContent
        .match(moleculesR)[1]
        .split(newLineR)
        .map(m => m.trim())
        .filter(m => m)
        .filter(m => !m.startsWith('#'))
        .map(p => p.match(/[^#]*/)[0])
        .map(p => p.trim())
        .filter(p => p)
        .map(m => m.split(/\t|\s/).filter(p => p))
        .map(mPartsToMolecule);
    }

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
        .map(o => o.trim())
        .filter(o => o)
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
      .filter(r => !r.includes(':\\'))
      .filter(r => r)
      .map(p => p.match(/[^#]*/)[0])
      .map(p => p.trim())
      .map(lineToReaction);

    if (diffusionsR.test(fileContent)) {
      model.diffusions = fileContent
        .match(diffusionsR)[1]
        .split(newLineR)
        .map(d => d.trim())
        .filter(d => !d.startsWith('#'))
        .filter(d => d)
        .map(d => d.match(/[^#]*/)[0])
        .map(d => d.trim())
        .map(d => d.split(/\t|\s/).filter(p => p))
        .map(partsToDiffusion);
    }

    return model;
}

function parseExtendedBngl({ name, content }) {
  const fileExt = name.split('.').slice(-1)[0];

  const revisionData = {};

  const collectionNames = [
    'structures',
    'molecules',
    'species',
    'reactions',
    'diffusions',
    'functions',
    'observables',
    'parameters',
  ];

  if (fileExt === 'bngl') {
    const model = buildFromBngl(content);
    collectionNames.forEach((collName) => {
      revisionData[collName] = revisionData[collName] || [];
      model[collName].forEach((entity) => {
        const revisionEntity = Object.assign({}, entity);
        revisionEntity.entityId = uuidv4();
        revisionData[collName].push(revisionEntity);
      });
    });
  }

  return revisionData;
}


export default {
  buildFromBngl,
  parseExtendedBngl,
};
