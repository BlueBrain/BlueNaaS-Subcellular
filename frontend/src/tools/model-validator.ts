//@ts-nocheck
import uniqBy from 'lodash/uniqBy';
import uniq from 'lodash/uniq';
import difference from 'lodash/difference';

import constants from '../constants';

const { EntityType, entityTypeCollectionMap, validationMessageType: messageType } = constants;

const entityTypesToValidate = [
  EntityType.STRUCTURE,
  EntityType.PARAMETER,
  EntityType.FUNCTION,
  EntityType.MOLECULE,
  EntityType.SPECIES,
  EntityType.OBSERVABLE,
  EntityType.REACTION,
  EntityType.DIFFUSION,
];

class ValidationResult {
  constructor() {
    this.valid = true;
    this.messages = [];
    this.context = null;
  }

  setContext(context) {
    this.context = context;
  }

  addMessage({ type, context, text }) {
    if (type === messageType.ERROR) {
      this.valid = false;
    }

    this.messages.push({
      text,
      type,
      context: context || this.context,
    });
  }
}

function getDefParamNames(bnglDefinition) {
  const paramNames = [];
  const r = /([a-zA-Z][a-zA-Z_0-9]*)([^a-zA-Z_0-9(]|$)/g;
  let match = r.exec(bnglDefinition);
  while (match) {
    paramNames.push(match[1]);
    match = r.exec(bnglDefinition);
  }

  return uniq(paramNames.filter((name) => !/^[eE][0-9]?/.test(name)));
}

function getDefFuncNames(bnglDefinition) {
  const funcNames = [];
  const r = /(^|[^0-9a-zA-Z])([a-zA-Z][a-zA-Z_0-9]*)\(/g;
  let match = r.exec(bnglDefinition);
  while (match) {
    funcNames.push(match[2]);
    match = r.exec(bnglDefinition);
  }

  return uniq(funcNames);
}

function getDefMolNames(bnglDefinition) {
  const molNames = [];
  const r = /([a-zA-Z][a-zA-Z_0-9]*)\(/g;
  let match = r.exec(bnglDefinition);
  while (match) {
    molNames.push(match[1]);
    match = r.exec(bnglDefinition);
  }

  return uniq(molNames);
}

function getDefStructNames(bnglDefinition) {
  const structNames = [];
  const r = /@([a-zA-Z][a-zA-Z_0-9]*)/g;
  let match = r.exec(bnglDefinition);
  while (match) {
    structNames.push(match[1]);
    match = r.exec(bnglDefinition);
  }

  return uniq(structNames);
}

class ModelValidator {
  constructor(model) {
    this.model = { ...model, valid: true, validationMessages: [] };
    this.allMessages = [];

    this.validateEntity = {
      [EntityType.STRUCTURE]: this.validateStructure.bind(this),
      [EntityType.MOLECULE]: this.validateMolecule.bind(this),
      [EntityType.SPECIES]: this.validateSpecies.bind(this),
      [EntityType.PARAMETER]: this.validateParameter.bind(this),
      [EntityType.FUNCTION]: this.validateFunction.bind(this),
      [EntityType.OBSERVABLE]: this.validateObservable.bind(this),
      [EntityType.REACTION]: this.validateReaction.bind(this),
      [EntityType.DIFFUSION]: this.validateDiffusion.bind(this),
    };
  }

  validateStructure(structure) {
    const validationResult = new ValidationResult();
    const context = `Structure ${structure.name}`;
    validationResult.setContext(context);

    if (this.model.structures.filter((s) => s.name === structure.name).length > 1) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'has been defined more than once',
      });
    }

    if (!structure.type) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'dimensional type is missing',
      });
    }

    if (!structure.uniProtId) {
      validationResult.addMessage({
        type: messageType.WARNING,
        text: 'UniProt SL id is missing',
      });
    }

    if (!structure.goId) {
      validationResult.addMessage({
        type: messageType.WARNING,
        text: 'GO id is missing',
      });
    }

    if (!structure.goId) {
      validationResult.addMessage({
        type: messageType.INFO,
        text: 'description is missing',
      });
    }

    return validationResult;
  }

  validateParameter(parameter) {
    const validationResult = new ValidationResult();
    const context = `Parameter ${parameter.name}`;
    validationResult.setContext(context);

    if (this.model.parameters.filter((p) => p.name === parameter.name).length > 1) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'has been defined more than once',
      });
    }

    if (!parameter.definition.trim()) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'invalid BNG definition',
      });
    }

    const modelParamNames = this.model.parameters.map((p) => p.name);
    const defParamNames = getDefParamNames(parameter.definition);
    const diffParamNames = difference(defParamNames, modelParamNames);
    if (diffParamNames.length) {
      diffParamNames.forEach((paramName) => {
        validationResult.addMessage({
          type: messageType.ERROR,
          text: `${paramName} parameter is not defined in the model`,
        });
      });
    }

    return validationResult;
  }

  validateFunction(func) {
    const validationResult = new ValidationResult();
    const context = `Function ${func.name}`;
    validationResult.setContext(context);

    if (this.model.functions.filter((f) => f.name === func.name).length > 1) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'has been defined more than once',
      });
    }

    if (!func.definition.trim()) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'invalid BNG definition',
      });
    }

    const modelParamNames = this.model.parameters.map((p) => p.name);
    const defParamNames = getDefParamNames(func.definition);
    const diffParamNames = difference(defParamNames, modelParamNames);
    if (diffParamNames.length) {
      diffParamNames.forEach((paramName) => {
        validationResult.addMessage({
          type: messageType.ERROR,
          text: `${paramName} parameter is not defined in the model`,
        });
      });
    }

    const modelFuncNames = this.model.functions.map((f) => f.name);
    const defFuncNames = getDefFuncNames(func.definition);
    const diffFuncNames = difference(defFuncNames, modelFuncNames);
    if (diffFuncNames.length) {
      diffFuncNames.forEach((funcName) => {
        validationResult.addMessage({
          type: messageType.ERROR,
          text: `${funcName} function is not defined in the model`,
        });
      });
    }

    return validationResult;
  }

  validateMolecule(molecule) {
    const validationResult = new ValidationResult();
    const context = `Molecule ${molecule.name}`;
    validationResult.setContext(context);

    if (this.model.molecules.filter((m) => m.name === molecule.name).length > 1) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'has been defined more than once',
      });
    }

    // TODO: add duplicate definition check

    if (!molecule.definition || !molecule.definition.trim()) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'BNG definition is missing',
      });
    } else if (getDefMolNames(molecule.definition).length === 0) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'invalid BNG definition',
      });
    }

    if (!molecule.agentType) {
      validationResult.addMessage({
        type: messageType.WARNING,
        text: 'agent type is missing',
      });
    } else {
      // TODO: check if corresponding id is present
    }

    if (!molecule.description) {
      validationResult.addMessage({
        type: messageType.INFO,
        text: 'descritption is missing',
      });
    }

    if (!molecule.geneName) {
      validationResult.addMessage({
        type: messageType.INFO,
        text: 'gene name is missing',
      });
    }

    return validationResult;
  }

  validateSpecies(species) {
    const validationResult = new ValidationResult();
    const context = `Species ${species.name}`;
    validationResult.setContext(context);

    if (this.model.species.filter((s) => s.name === species.name).length > 1) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'has been defined more than once',
      });
    }

    if (this.model.species.filter((s) => s.definition === species.definition).length > 1) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'BNG definition has been declared more than once',
      });
    }

    const modelStructureNames = this.model.structures.map((s) => s.name);
    const speciesStructureNames = getDefStructNames(species.definition);
    const diffStructNames = difference(speciesStructureNames, modelStructureNames);
    if (diffStructNames.length) {
      diffStructNames.forEach((structName) => {
        validationResult.addMessage({
          type: messageType.ERROR,
          text: `${structName} structure is not defined in the model`,
        });
      });
    }

    const modelMoleculeDefNames = this.model.molecules.flatMap((m) => getDefMolNames(m.definition));

    const specMoleculeDefNames = getDefMolNames(species.definition);

    if (!specMoleculeDefNames.length) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'invalid BNG definition',
      });
    }

    const diffMolDefNames = difference(specMoleculeDefNames, modelMoleculeDefNames);
    if (diffMolDefNames.length) {
      diffMolDefNames.forEach((moleculeName) => {
        validationResult.addMessage({
          type: messageType.ERROR,
          text: `${moleculeName} molecule is not defined in the model`,
        });
      });
    }

    const validateConcentration = (concentration, concSource) => {
      if (!concentration.trim()) {
        validationResult.addMessage({
          type: messageType.ERROR,
          text: `${concSource} concentration is missing`,
        });
      }

      const modelParamNames = this.model.parameters.map((p) => p.name);
      const concDefParamNames = getDefParamNames(concentration);
      const diffParamNames = difference(concDefParamNames, modelParamNames);

      if (diffParamNames.length) {
        diffParamNames.forEach((paramName) => {
          validationResult.addMessage({
            type: messageType.ERROR,
            text: `${paramName} parameter is not defined in the model`,
          });
        });
      }
    };

    this.model.config.concSources.forEach((concSource) => {
      validateConcentration(species.concentration[concSource], concSource);
    });

    return validationResult;
  }

  validateReaction(reaction) {
    const validationResult = new ValidationResult();
    const context = `Reaction ${reaction.name}`;
    validationResult.setContext(context);

    if (this.model.reactions.filter((s) => s.name === reaction.name).length > 1) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'has been defined more than once',
      });
    }

    if (this.model.reactions.filter((s) => s.definition === reaction.definition).length > 1) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'BNG definition has been declared more than once',
      });
    }

    const reacMoleculeDefinitions = reaction.definition.split(/[^!]\+|<->|->/);
    const allMolDefsHaveStructs = reacMoleculeDefinitions.every(
      (molDef) => getDefStructNames(molDef).length,
    );

    if (!allMolDefsHaveStructs) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'missing structures in reaction definition',
      });
    }

    const modelStructureNames = this.model.structures.map((s) => s.name);
    const reactionStructureNames = getDefStructNames(reaction.definition);
    const diffStructNames = difference(reactionStructureNames, modelStructureNames);
    if (diffStructNames.length) {
      diffStructNames.forEach((structName) => {
        validationResult.addMessage({
          type: messageType.ERROR,
          text: `${structName} structure is not defined in the model`,
        });
      });
    }

    const modelMoleculeDefNames = this.model.molecules.flatMap((m) => getDefMolNames(m.definition));

    const specMoleculeDefNames = getDefMolNames(reaction.definition);

    if (!specMoleculeDefNames.length) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'invalid BNG definition',
      });
    }

    const diffMolDefNames = difference(specMoleculeDefNames, modelMoleculeDefNames);
    if (diffMolDefNames.length) {
      diffMolDefNames.forEach((moleculeName) => {
        validationResult.addMessage({
          type: messageType.ERROR,
          text: `${moleculeName} molecule is not defined in the model`,
        });
      });
    }

    if (!reaction.kf.trim()) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'rate is missing',
      });
    }

    const modelParamNames = this.model.parameters.map((p) => p.name);
    const kfDefParamNames = getDefParamNames(reaction.kf);
    const diffParamNames = difference(kfDefParamNames, modelParamNames);

    if (diffParamNames.length) {
      diffParamNames.forEach((paramName) => {
        validationResult.addMessage({
          type: messageType.ERROR,
          text: `${paramName} parameter is not defined in the model`,
        });
      });
    }

    const modelFuncNames = this.model.functions.map((f) => f.name);
    const kfDefFuncNames = getDefFuncNames(reaction.kf);
    const diffFuncNames = difference(kfDefFuncNames, modelFuncNames);

    if (diffFuncNames.length) {
      diffFuncNames.forEach((funcName) => {
        validationResult.addMessage({
          type: messageType.ERROR,
          text: `${funcName} function is not defined in the model`,
        });
      });
    }

    return validationResult;
  }

  validateObservable(observable) {
    const validationResult = new ValidationResult();
    const context = `Observable ${observable.name}`;
    validationResult.setContext(context);

    if (this.model.observables.filter((o) => o.name === observable.name).length > 1) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'has been defined more than once',
      });
    }

    if (this.model.observables.filter((o) => o.definition === observable.definition).length > 1) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'BNG definition has been declared more than once',
      });
    }

    const modelStructureNames = this.model.structures.map((s) => s.name);
    const observableStructureNames = getDefStructNames(observable.definition);
    const diffStructNames = difference(observableStructureNames, modelStructureNames);
    if (diffStructNames.length) {
      diffStructNames.forEach((structName) => {
        validationResult.addMessage({
          type: messageType.ERROR,
          text: `${structName} structure is not defined in the model`,
        });
      });
    }

    const modelMoleculeDefNames = this.model.molecules.flatMap((m) => getDefMolNames(m.definition));

    const observableMoleculeDefNames = getDefMolNames(observable.definition);

    if (!observableMoleculeDefNames.length) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'invalid BNG definition',
      });
    }

    const diffMolDefNames = difference(observableMoleculeDefNames, modelMoleculeDefNames);
    if (diffMolDefNames.length) {
      diffMolDefNames.forEach((moleculeName) => {
        validationResult.addMessage({
          type: messageType.ERROR,
          text: `${moleculeName} molecule is not defined in the model`,
        });
      });
    }

    return validationResult;
  }

  validateDiffusion(diffusion) {
    const validationResult = new ValidationResult();
    const context = `Diffusion ${diffusion.name}`;
    validationResult.setContext(context);

    if (this.model.diffusions.filter((d) => d.name === diffusion.name).length > 1) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'has been defined more than once',
      });
    }

    if (this.model.diffusions.filter((o) => o.definition === diffusion.definition).length > 1) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'BNG definition has been declared more than once',
      });
    }

    const modelStructureNames = this.model.structures.map((s) => s.name);
    const diffusionStructureNames = getDefStructNames(diffusion.definition);
    const diffStructNames = difference(diffusionStructureNames, modelStructureNames);
    if (diffStructNames.length) {
      diffStructNames.forEach((structName) => {
        validationResult.addMessage({
          type: messageType.ERROR,
          text: `${structName} structure is not defined in the model`,
        });
      });
    }

    const modelMoleculeDefNames = this.model.molecules.flatMap((m) => getDefMolNames(m.definition));

    const diffusionMoleculeDefNames = getDefMolNames(diffusion.definition);

    if (!diffusionMoleculeDefNames.length) {
      validationResult.addMessage({
        type: messageType.ERROR,
        text: 'invalid BNG definition',
      });
    }

    const diffMolDefNames = difference(diffusionMoleculeDefNames, modelMoleculeDefNames);
    if (diffMolDefNames.length) {
      diffMolDefNames.forEach((moleculeName) => {
        validationResult.addMessage({
          type: messageType.ERROR,
          text: `${moleculeName} molecule is not defined in the model`,
        });
      });
    }

    return validationResult;
  }

  validateEntityCollection(entityType) {
    const entities = this.model[entityTypeCollectionMap[entityType]];
    entities.forEach((entity) => {
      Object.assign(entity, { valid: true, validationMessages: [] });

      const result = this.validateEntity[entityType](entity);

      entity.validationMessages = result.messages;
      entity.valid = result.valid;

      this.allMessages = this.allMessages.concat(result.messages);
      if (!result.valid) {
        this.model.valid = false;
      }
    });
  }

  validate() {
    this.allValidationMessages = [];
    this.model.validationMessages = [];
    this.model.valid = true;

    entityTypesToValidate.forEach((entityType) => this.validateEntityCollection(entityType));

    this.model.validationMessages = uniqBy(
      this.allMessages,
      (message) => `${message.context}: ${message.text}`,
    );

    return this.model.valid;
  }
}

export default ModelValidator;
