
import Vue from 'vue';
import findIndex from 'lodash/findIndex';
import get from 'lodash/get';
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

    const currentSim = state.model.simulations[simIndex];
    const simulation = Object.assign({}, currentSim, simStatus);
    Vue.set(state.model.simulations, simIndex, simulation);

    // TODO: consider refactoring .selectedEntity
    if (get(state, 'selectedEntity.entity.id') === simStatus.id) {
      Vue.set(state.selectedEntity.entity, 'status', simStatus.status);
    }
  },

  setSimTraceMeta(state, simTraceMeta) {
    const simIndex = state.model.simulations.map(sim => sim.id).indexOf(simTraceMeta.id);
    const currentSimulation = state.model.simulations[simIndex];
    const simulation = Object.assign({}, currentSimulation, simTraceMeta);
    Vue.set(state.model.simulations, simIndex, simulation);
  },

  addSimStepTrace(state, simStepTrace) {
    const simIndex = state.model.simulations.map(sim => sim.id).indexOf(simStepTrace.id);
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

  setEntitySelection(state, { type, entity }) {
    Vue.set(state, 'selectedEntity', {
      type,
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
    state.model[entityCollection] = state.model[entityCollection]
      .filter(entity => entity.name !== state.selectedEntity.entity.name);

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
};
