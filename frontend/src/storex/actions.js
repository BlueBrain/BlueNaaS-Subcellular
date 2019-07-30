
import cloneDeep from 'lodash/cloneDeep';
import pick from 'lodash/pick';
import saveAs from 'file-saver';
import uuidv4 from 'uuid/v4';

import * as Sentry from '@sentry/browser';

import storage from '@/services/storage';
import socket from '@/services/websocket';
import constants from '@/constants';
import modelBuilder from '@/services/model-builder';
import modelTools from '@/tools/model-tools';


export default {
  async init({ dispatch }) {
    let user = await storage.getItem('user');
    if (!user) {
      user = {
        id: uuidv4(),
        fullName: '',
        email: '',
      };
    }
    dispatch('setUser', user);
    socket.clientId = user.id;
    socket.init();
  },

  setUser({ commit }, user) {
    storage.setItem('user', user);
    commit('setUser', user);
  },

  removeSelectedEntity({ state, commit }) {
    if (state.selectedEntity.type === 'simulation') {
      socket.send('delete_simulation', state.selectedEntity.entity);
    }

    commit('removeSelectedEntity');
  },

  modifySelectedEntity({ state, commit }, entity) {
    if (state.selectedEntity.type === 'simulation') {
      const simUpdateObj = pick(entity, ['id', 'clientId', 'modelId', 'name', 'solver', 'tStop', 'nSteps', 'stimuli', 'annotation']);
      socket.send('update_simulation', simUpdateObj);
    }

    commit('modifySelectedEntity', entity);
  },

  async saveModel({ state, commit }) {
    const models = cloneDeep(state.dbModels);
    models[state.model.name] = state.model;
    await storage.setItem('models', models);
    commit('updateDbModels', cloneDeep(models));
  },

  async createGeometry({ commit, dispatch }, geometryRaw) {
    const { geometry } = await socket.request('create_geometry', geometryRaw);
    commit('setGeometry', geometry);
    dispatch('setStructSizesFromGeometry');
  },

  setStructSizesFromGeometry({ state, commit }) {
    const { structures } = state.model.geometry;
    structures.forEach((geomStruct) => {
      const modelStructIdx = state.model.structures.findIndex(s => s.name === geomStruct.name);
      if (modelStructIdx === -1) return;

      commit('modifyEntity', {
        type: 'structure',
        entityIndex: modelStructIdx,
        keyName: 'size',
        value: geomStruct.size.toPrecision(5),
      });
    });
  },

  async loadDbModels({ commit }) {
    const storageModels = await storage.getItem('models');
    const models = storageModels || {};
    commit('updateDbModels', cloneDeep(models));
  },

  async deleteDbModel({ state, commit }, model) {
    const models = state.dbModels;
    delete models[model.name];
    await storage.setItem('models', models);
    commit('updateDbModels', cloneDeep(models));
    commit('resetEntitySelection');
  },

  createModel({ commit }, proteins) {
    const modelDiff = modelBuilder.buildFromProteins(proteins);
    commit('addToModel', modelDiff);
  },

  loadDbModel({ commit, dispatch }, model) {
    commit('loadDbModel', model);
    if (model.public) {
      dispatch('cloneSimulations', model.simulations);
    } else {
      dispatch('getSimulations');
    }
  },

  async exportModel({ state }, exportFormat) {
    const cleanSimulations = state.model.simulations
      .map(sim => modelTools.createSimulationTemplate(sim));

    const model = Object.assign({}, state.model, { simulations: cleanSimulations });

    const { fileContent: modelData } = await socket.request('get_exported_model', {
      model,
      format: exportFormat,
    });

    const fileExtension = constants.ModelFormatExtensions[exportFormat];
    saveAs(new Blob([modelData]), `${state.model.name}.${fileExtension}`);
  },

  addSimulation({ commit }, simulation) {
    commit('addSimulation', simulation);
    commit('setEntitySelection', {
      type: 'simulation',
      entity: simulation,
    });
    socket.send('create_simulation', simulation);
  },

  async getSimulations({ state, commit }) {
    const { simulations } = await socket.request('get_simulations', { modelId: state.model.id });
    commit('setSimulations', simulations);
  },

  async cloneSimulations({ state, commit }, sampleSimulations) {
    const { simulations: userSimulations } = await socket.request('get_simulations', { modelId: state.model.id });
    if (userSimulations.length) {
      commit('setSimulations', userSimulations);
      return;
    }

    const uid = state.user.id;
    const simulations = sampleSimulations
      .map(sim => Object.assign({}, sim, { clientId: uid, id: uuidv4() }));

    simulations.forEach(sim => socket.send('create_simulation', sim));
    commit('setSimulations', simulations);
  },

  runSimulation({ state, commit }, simulation) {
    commit('setSimulationStatusById', {
      id: simulation.id,
      status: constants.SimStatus.READY_TO_RUN,
    });
    commit('setEntitySelectionProp', { propName: 'status', value: constants.SimStatus.READY_TO_RUN });

    const { model } = state;

    // TODO: rnf generation from stimuli on backend
    const rnf = [
      '-xml model.xml',
      '-v',
      '-utl 3',
      '-o model.gdat',
      '',
      'begin',
      `sim ${simulation.solverConf.tEnd} ${simulation.solverConf.nSteps}`,
      'end',
    ].join('\n');

    const simConfig = Object.assign({
      id: simulation.id,
      clientId: state.user.id,
      model,
      rnf,
    }, simulation);

    socket.send('run_simulation', simConfig);
  },

  cancelSimulation({ state }, simulation) {
    // TODO: remove clientId from request
    const simConfig = {
      id: simulation.id,
      clientId: state.user.id,
    };

    socket.send('cancel_simulation', simConfig);
  },

  clearModel({ commit }) {
    commit('setModel', cloneDeep(constants.defaultEmptyModel));
  },

  async importRevisionFile({ dispatch }, { name, type, fileContent }) {
    // TODO: DRY
    let revision = null;
    let bnglStr = null;

    if (type === 'bngl') {
      bnglStr = fileContent;
    } else if (type === 'sbml') {
      const translationResult = await socket.request('convert_from_sbml', { sbml: fileContent });
      bnglStr = translationResult.bngl;
      if (!bnglStr) throw new Error('Error in SBML translation');
    }

    try {
      revision = modelBuilder.buildFromBngl(bnglStr);
    } catch (e) {
      Sentry.configureScope((scope) => {
        scope.setExtra('bnglModel', bnglStr);
        scope.setExtra('importSource', type);
      });
      Sentry.captureEvent('bnglImportError');
      throw new Error('Error while parsing BNGL');
    }

    dispatch('mergeRevision', {
      revisionData: revision,
      source: `file:${name}`,
    });
  },

  async importModel({ commit, dispatch }, { modelName, type, fileContent }) {
    let model = null;
    let bnglStr = null;

    if (type === 'ebngl') {
      // TODO: add content type and schema validation
      const model = JSON.parse(fileContent);

      const simFreeModel = Object.assign({}, model, { simulations: [], id: uuidv4() });
      commit('setModel', simFreeModel);

      dispatch('cloneSimulations', model.simulations);
      return;
    }

    if (type === 'bngl') {
      bnglStr = fileContent;
    } else if (type === 'sbml') {
      const translationResult = await socket.request('convert_from_sbml', { sbml: fileContent });
      bnglStr = translationResult.bngl;
      if (!bnglStr) throw new Error('Error in SBML translation');
    }

    try {
      model = modelBuilder.buildFromBngl(bnglStr);
    } catch (e) {
      Sentry.configureScope((scope) => {
        scope.setExtra('bnglModel', bnglStr);
        scope.setExtra('importSource', type);
      });
      Sentry.captureEvent('bnglImportError');
      throw new Error('Error while parsing BNGL');
    }

    model.name = modelName;
    commit('setModel', model);
  },

  async queryMolecularRepo({ commit }, query) {
    const { queryResult } = await socket.request('query_molecular_repo', query);
    commit('setRepoQueryResult', queryResult);
  },

  saveRevision({ state }) {
    return socket.request('save_revision', state.revision);
  },

  async mergeRevisionWithModel({ commit }, { branch, revision }) {
    if (revision !== 'latest') {
      commit('mergeRevisionWithModel', { branch, revision });
      return;
    }

    const { rev: latestRev } = await socket.request('get_branch_latest_rev', branch);
    commit('mergeRevisionWithModel', { branch, revision: latestRev });
  },

  async importRevision({ commit }, params) {
    const { revision } = await socket.request('get_revision', params);
    commit('mergeRevision', {
      source: `rev:${params.branch}:${params.revision}`,
      revisionData: revision,
    });
    commit('validateRevision');
  },

  mergeRevision({ commit }, { source, revisionData }) {
    commit('mergeRevision', { source, revisionData });
    commit('validateRevision');
  },

  updateRevisionEntity({ commit }, { type, entity }) {
    commit('updateRevisionEntity', { type, entity });
    commit('validateRevision');
  },

  removeRevisionEntities({ commit }, { type, entities }) {
    commit('removeRevisionEntities', { type, entities });
    commit('validateRevision');
  },

  setRepoQueryHighlightVersionKey({ commit }, versionKey) {
    commit('setRepoQueryHighlightVersionKey', versionKey);
    commit('updateRepoQueryEntityStyles');
  },

  renameRevConcSource({ commit }, { sourceIndex, newSource }) {
    commit('renameRevConcSource', { sourceIndex, newSource });
    commit('updateRevVisibleConcSources');
    commit('validateRevision');
  },

  removeRevConcSource({ commit }, sourceIndex) {
    commit('removeRevConcSource', sourceIndex);
    commit('updateRevVisibleConcSources');
    commit('validateRevision');
  },

  addRevConcSource({ commit }, concSource) {
    commit('addRevConcSource', concSource);
    commit('updateRevVisibleConcSources');
    commit('validateRevision');
  },
};
