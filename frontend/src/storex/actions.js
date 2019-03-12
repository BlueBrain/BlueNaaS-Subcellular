
import cloneDeep from 'lodash/cloneDeep';
import pick from 'lodash/pick';
import saveAs from 'file-saver';
import uuidv4 from 'uuid/v4';

import storage from '../services/storage';
import socket from '../services/websocket';
import constants from '../constants';
import modelBuilder from '@/services/model-builder';


export default {
  async init({ commit }) {
    let user = await storage.getItem('user');
    if (!user) {
        user = {
        id: uuidv4(),
        fullName: '',
        email: '',
      };
    }
    commit('setUser', user);
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
    // TODO: move bngl parse to service

    const newLineR = /\r\n|\r|\n/;

    const model = Object.assign({ id: uuidv4(), name: modelName }, cloneDeep(constants.defaultEmptyModel));

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
        name: parts[0].match(/(.*?)\(/)[1],
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

    commit('setModel', model);
  },
};
