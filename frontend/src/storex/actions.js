
import cloneDeep from 'lodash/cloneDeep';
import pick from 'lodash/pick';
import saveAs from 'file-saver';
import uuidv4 from 'uuid/v4';

import * as Sentry from '@sentry/browser';

import storage from '@/services/storage';
import socket from '@/services/websocket';
import constants from '@/constants';
import modelBuilder from '@/services/model-builder';


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

  async createGeometry({ commit }, geometryRaw) {
    const { geometry } = await socket.request('create_geometry', geometryRaw);
    commit('setGeometry', geometry);
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
    dispatch('getSimulations');
  },

  async exportModel({ state }, exportFormat) {
    const { fileContent: modelText } = await socket.request('get_exported_model', {
      model: state.model,
      format: exportFormat,
    });
    const fileExtension = constants.ModelFormatExtensions[exportFormat];
    saveAs(new Blob([modelText]), `${state.model.name}.${fileExtension}`);
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

  importModel({ commit }, { modelName, fileContent }) {
    let model = null;
    try {
      model = modelBuilder.buildFromBngl(fileContent);
    } catch (e) {
      Sentry.configureScope((scope) => {
        scope.setExtra('bnglModel', fileContent);
      });
      Sentry.captureEvent('bnglImportError');
    }

    if (!model) return Promise.reject();

    model.name = modelName;
    commit('setModel', model);
    return Promise.resolve();
  },
};
