
import Vue from 'vue';
import findIndex from 'lodash/findIndex';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';

import constants from '@/constants';


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
};


export default {
  setUser(state, user) {
    state.user = user;
  },

  setNonBnglStructures(state, value) {
    state.model.nonBnglStructures = value;
  },

  setGeometry(state, geometry) {
    state.model.geometry = geometry;
  },

  addStructure(state, structure) {
    state.model.structures.push(structure);
  },

  addParameter(state, parameter) {
    state.model.parameters.push(parameter);
  },

  addFunction(state, fn) {
    state.model.functions.push(fn);
  },

  addMolecule(state, molecule) {
    state.model.molecules.push(molecule);
  },

  addSpecies(state, species) {
    state.model.species.push(species);
  },

  addReaction(state, reaction) {
    state.model.reactions.push(reaction);
  },

  addObservable(state, observable) {
    state.model.observables.push(observable);
  },

  addDiffusion(state, diffusion) {
    state.model.diffusions.push(diffusion);
  },

  addSimulation(state, simulation) {
    state.model.simulations.push(simulation);
  },

  addEntity(state, entityType, entity) {
    state.model[entityTypeCollectionMap[entityType]].push(entity);
  },

  setSimulationStatusById(state, { id, status }) {
    const simulationIndex = state.model.simulations.map(simulation => simulation.id).indexOf(id);
    Vue.set(state.model.simulations[simulationIndex], 'status', status);
  },

  setSimStatus(state, simStatus) {
    // TODO: deprecate in favor of upper one
    const simIndex = state.model.simulations.map(sim => sim.id).indexOf(simStatus.id);

    // TODO: refactor
    if (!simStatus.log) {
      delete simStatus.log;
    }

    const currentSim = state.model.simulations[simIndex];
    const simulation = Object.assign({}, currentSim, simStatus);

    // add description as system log if there are no logs
    // TODO: refactor
    if (!simulation.log && simulation.description) {
      simulation.log = {
        system: simulation.description,
      };
    }

    Vue.set(state.model.simulations, simIndex, simulation);

    // TODO: consider refactoring .selectedEntity
    if (get(state, 'selectedEntity.entity.id') === simStatus.id) {
      Vue.set(state.selectedEntity, 'entity', cloneDeep(simulation));
    }
  },

  addSimLog(state, simLog) {
    const sim = state.model.simulations
      .find(sim => sim.id === simLog.id);

    if (!sim.log || !sim.log.system) sim.log = { system: '' };

    sim.log.system += `${simLog.message}\n`;
  },

  setSimTraceMeta(state, simTraceMeta) {
    const simIndex = state.model.simulations.map(sim => sim.id).indexOf(simTraceMeta.id);
    const currentSimulation = state.model.simulations[simIndex];
    const simulation = Object.assign({}, currentSimulation, simTraceMeta);
    Vue.set(state.model.simulations, simIndex, simulation);
  },

  addSimStepTrace(state, simStepTrace) {
    const simIndex = state.model.simulations.map(sim => sim.id).indexOf(simStepTrace.id);

    if (simIndex === -1) return;

    const currentSimulation = state.model.simulations[simIndex];
    const simulation = Object.assign({}, currentSimulation);
    simulation.times.push(simStepTrace.t);
    simulation.values.push(simStepTrace.values);
    simulation.currentStepIdx = simStepTrace.stepIdx;
    Vue.set(state.model.simulations, simIndex, simulation);
  },

 setSimTrace(state, simTrace) {
  const simIndex = state.model.simulations.map(sim => sim.id).indexOf(simTrace.id);
  const currentSimulation = state.model.simulations[simIndex];
  const simulation = Object.assign({}, currentSimulation, simTrace);
  Vue.set(state.model.simulations, simIndex, simulation);
 },

  setSimulations(state, simulations) {
    Vue.set(state.model, 'simulations', simulations);
  },

  setEntitySelection(state, { type, entity, index }) {
    Vue.set(state, 'selectedEntity', {
      type,
      index,
      entity,
    });
  },

  setEntitySelectionProp(state, { propName, value }) {
    Vue.set(state.selectedEntity.entity, propName, value);
  },

  resetEntitySelection(state) {
    state.selectedEntity = null;
  },

  modifySelectedEntity(state, modifiedEntityReactiveObj) {
    const modifiedEntity = Object.assign({}, modifiedEntityReactiveObj);
    const entityCollection = entityTypeCollectionMap[state.selectedEntity.type];
    const entityIndex = findIndex(state.model[entityCollection], e => e.name === state.selectedEntity.entity.name);
    Vue.set(state.model[entityCollection], entityIndex, modifiedEntity);
    Vue.set(state.selectedEntity, 'entity', modifiedEntity);
  },

  modifyEntity(state, { type, entityIndex, keyName, value }) {
    Vue.set(state.model[entityTypeCollectionMap[type]][entityIndex], keyName, value);
  },

  removeSelectedEntity(state) {
    const entityCollection = entityTypeCollectionMap[state.selectedEntity.type];
    const { index } = state.selectedEntity;
    state.model[entityCollection].splice(index, 1);

    state.selectedEntity = null;
  },

  updateModelName(state, name) {
    state.model.name = name;
  },

  updateModelAnnotation(state, annotation) {
    state.model.annotation = annotation;
  },

  updateDbModels(state, models) {
    state.dbModels = models;
  },

  loadDbModel(state, model) {
    state.model = Object.assign({}, constants.defaultEmptyModel, model);
  },

  setModel(state, model) {
    state.model = model;
  },

  addToModel(state, modelDiff) {
    const entities = ['structures', 'parameters', 'functions', 'molecules', 'species', 'observables', 'reactions'];
    entities.forEach((entity) => {
      state.model[entity] = state.model[entity].concat(modelDiff[entity]);
    });
  },

  renameRevConcSource(state, { sourceIndex, newSource }) {
    const currentConcentrationSources = state.revision.config.concSources;
    const sourceToRename = currentConcentrationSources[sourceIndex];

    state.revision.species.forEach((species) => {
      const concValue = species.concentration[sourceToRename];
      delete species.concentration[sourceToRename];
      Vue.set(species.concentration, newSource, concValue);
    });

    Vue.set(currentConcentrationSources, sourceIndex, newSource);
  },

  removeRevConcSource(state, sourceIndex) {
    const sourceToRemove = state.revision.config.concSources[sourceIndex];

    state.revision.config.concSources.splice(sourceIndex, 1);
    state.revision.species.forEach((species) => {
      delete species.concentration[sourceToRemove];
    });
  },

  addRevConcSource(state, concSource) {
    state.revision.species.forEach((species) => {
      Vue.set(species.concentration, concSource, '0');
    });
    state.revision.config.concSources.push(concSource);
  },

  setRevisionVisibleConcSources(state, visibleConcSources) {
    Vue.set(state.revision.config, 'visibleConcSources', visibleConcSources);
  },

  setRevisionQueryVisibleConcSources(state, visibleConcSources) {
    Vue.set(state.repoQueryConfig, 'visibleConcSources', visibleConcSources);
  },

  importConcentration(state, { importCollection, concSource }) {
    importCollection.forEach((importObj) => {
      const specEntityId = importObj.species[importObj.specIdx].entityId;
      const revSpec = state.revision.species
        .find(s => s.entityId === specEntityId);

      const conc = importObj.newConcentrations[importObj.newConcentrationIdx];
      Vue.set(revSpec.concentration, concSource, conc);
    });
  },
};
