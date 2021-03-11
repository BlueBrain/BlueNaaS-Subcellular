import words from 'lodash/words';
import cloneDeep from 'lodash/cloneDeep';
import { v4 as uuid } from 'uuid';

import constants from '@/constants';
import modelTools from '@/tools/model-tools';
import { Structure } from '@/types';

function sPartsToStructure(sParts: string[]): Structure {
  return {
    name: sParts[0],
    type: sParts[1] === '3' ? 'compartment' : 'membrane',
    size: sParts[2],
    parentName: sParts[3] ? sParts[3] : '-',
    annotation: '',
    entityId: uuid(),
  };
}

const pPartsToParameter = (pParts: string[]) => ({
  name: pParts[0],
  definition: pParts.slice(1).join(' '),
  annotation: '',
  entityId: uuid(),
});

const lineToFunction = (line: string) => {
  const functionR = /(\w+)\((\w*)\)\s*=?\s*(.*)/;
  const functionMatch = line.match(functionR);

  const func = {
    name: functionMatch[1],
    argument: functionMatch[2],
    definition: functionMatch[3],
    annotation: '',
    entityId: uuid(),
  };

  return func;
};

const mPartsToMolecule = (mParts) => {
  const molecule = {
    name: mParts[0].match(/(.*)\(/)[1],
    definition: mParts[0],
    annotation: '',
    entityId: uuid(),
  };

  return molecule;
};

function getRegex(line: string) {
  if (line.includes('TotalRate'))
    return /^((?<name>\w*)\s?:)?\s*(?<definition>.*)\s+(?<kf>\S+\(\))\s+TotalRate#?(?<annotation>.*?)$/; // Functional reaction

  if (line.includes('<->'))
    // Bidirectional reaction
    return /^((?<name>\w*)\s?:)?\s*(?<definition>.*)\s+(?<kf>\S+)\s*,\s*(?<kr>\S+)#?(?<annotation>.*?)$/;

  return /^((?<name>\w*)\s?:)?\s*(?<definition>.*)\s+(?<kf>\S+)#?(?<annotation>.*?)$/; // Unidirectional reaction
}

const lineToReaction = (line: string) => {
  const reactionR = getRegex(line);

  const reactionGroups = line.match(reactionR)?.groups;

  if (!reactionGroups) {
    throw new Error('Wrongly formatted bngl');
  }

  return {
    name: reactionGroups.name || '',
    definition: reactionGroups.definition,
    kf: reactionGroups.kf,
    kr: reactionGroups.kr || '',
    annotation: reactionGroups.annotation || '',
    entityId: uuid(),
  };
};

const partsToObservable = (parts: string[]) => ({
  name: parts[1],
  definition: parts[2],
  annotation: '',
  entityId: uuid(),
});

const partsToDiffusion = (parts: string[]) => {
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
    entityId: uuid(),
  };
};

export default function buildFromBngl(fileContent: string) {
  console.log(fileContent);
  const newLineR = /\r\n|\r|\n/;

  const model = Object.assign(cloneDeep(constants.defaultEmptyModel), {
    id: uuid(),
  });

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
      .map((s) => s.trim())
      .filter((s) => s)
      .filter((s) => !s.startsWith('#'))
      .map((p) => p.match(/[^#]*/)[0])
      .map((p) => p.trim())
      .map((s) => s.split(/\t|\s/).filter((p) => p))
      .map(sPartsToStructure);
  }

  if (parametersR.test(fileContent)) {
    model.parameters = fileContent
      .match(parametersR)[1]
      .split(newLineR)
      .filter((p) => p)
      .map((p) => p.trim())
      .filter((p) => !p.startsWith('#'))
      .map((p) => p.match(/[^#]*/)[0])
      .map((p) => p.trim())
      .filter((p) => p)
      .map((p) => p.split(/\t|\s/).filter((p) => p))
      .map(pPartsToParameter);
  }

  if (functionsR.test(fileContent)) {
    model.functions = fileContent
      .match(functionsR)[1]
      .split(newLineR)
      .map((f) => f.trim())
      .filter((f) => f)
      .filter((f) => !f.startsWith('#'))
      .map((p) => p.match(/[^#]*/)[0])
      .map((p) => p.trim())
      .map(lineToFunction);
  }

  if (moleculesR.test(fileContent)) {
    model.molecules = fileContent
      .match(moleculesR)[1]
      .split(newLineR)
      .map((m) => m.trim())
      .filter((m) => m)
      .filter((m) => !m.startsWith('#'))
      .map((p) => p.match(/[^#]*/)[0])
      .map((p) => p.trim())
      .filter((p) => p)
      .map((m) => m.split(/\t|\s/).filter((p) => p))
      .map(mPartsToMolecule);
  }

  if (speciesR.test(fileContent)) {
    model.species = fileContent
      .match(speciesR)[1]
      .split(newLineR)
      .map((s) => s.trim())
      .filter((s) => s)
      .filter((s) => !s.startsWith('#'))
      .map((p) => p.match(/[^#]*/)[0])
      .map((p) => p.trim())
      .map((s) => s.split(/\t|\s/).filter((p) => p))
      .map((parts) => {
        const def = parts[0];

        return {
          name: words(parts[0].match(/(.*)(\(?|$)/)[1]).join('_'),
          definition: def,
          concentration: parts[1],
          unit: modelTools.getDefaultSpecUnit(model, def),
          annotation: '',
          entityId: uuid(),
        };
      });
  }

  if (observablesR.test(fileContent)) {
    model.observables = fileContent
      .match(observablesR)[1]
      .split(newLineR)
      .map((o) => o.trim())
      .filter((o) => o)
      .filter((o) => !o.startsWith('#'))
      .map((p) => p.match(/[^#]*/)[0])
      .map((p) => p.trim())
      .map((o) => o.split(/\t|\s/).filter((p) => p))
      .map(partsToObservable);
  }

  model.reactions = fileContent
    .match(reactionsR)[1]
    .split(newLineR)
    .map((r) => r.trim())
    .filter((r) => !r.startsWith('#'))
    .filter((r) => !r.includes(':\\'))
    .filter((r) => r)
    .map((p) => p.match(/[^#]*/)[0])
    .map((p) => p.trim())
    .map(lineToReaction);

  if (diffusionsR.test(fileContent)) {
    model.diffusions = fileContent
      .match(diffusionsR)[1]
      .split(newLineR)
      .map((d) => d.trim())
      .filter((d) => !d.startsWith('#'))
      .filter((d) => d)
      .map((d) => d.match(/[^#]*/)[0])
      .map((d) => d.trim())
      .map((d) => d.split(/\t|\s/).filter((p) => p))
      .map(partsToDiffusion);
  }

  return model;
}
