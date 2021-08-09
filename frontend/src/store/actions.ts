//@ts-nocheck
import cloneDeep from 'lodash/cloneDeep';
import pick from 'lodash/pick';
import saveAs from 'file-saver';
import uuidv4 from 'uuid/v4';
import { decode, encode } from '@msgpack/msgpack';

import * as Sentry from '@sentry/browser';

import buildFromBngl from '@/services/model-builder';
import ModelGeometry from '@/services/model-geometry';
import storage from '@/services/storage';
import socket from '@/services/websocket';
import { removeSimulation } from '@/services/sim-data-storage';
import constants from '@/constants';
import modelTools from '@/tools/model-tools';
import arrayBufferToBase64 from '@/tools/array-buffer-to-base64';
import publicModels from '@/data/public-models';

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
    socket.userId = user.id;
    socket.init();
    await dispatch('loadDbModels');
  },

  setUser({ commit }, user) {
    storage.setItem('user', user);
    commit('setUser', user);
  },

  removeSelectedSimulation({ state, dispatch }) {
    removeSimulation(state.selectedEntity.entity.id);
    socket.send('delete_simulation', state.selectedEntity.entity);
    dispatch('removeSelectedEntity');
  },

  removeSelectedEntity({ state, commit }) {
    commit('removeSelectedEntity');
  },

  modifySelectedEntity({ state, commit }, entity) {
    if (state.selectedEntity.type === 'simulation') {
      const simUpdateObj = pick(entity, [
        'id',
        'userId',
        'modelId',
        'name',
        'solver',
        'solverConf',
        'tStop',
        'nSteps',
        'annotation',
      ]);
      socket.send('update_simulation', simUpdateObj);
    }

    commit('modifySelectedEntity', entity);
  },

  async saveModel({ state, commit }) {
    const models = cloneDeep(state.dbModels);
    const currentModel = { ...state.model };
    if (currentModel.geometry) {
      const geometryId = currentModel.geometry.id;
      await storage.setItem(`geometry:${geometryId}`, currentModel.geometry);
      currentModel.geometry = { id: geometryId };
    }

    models[currentModel.name] = currentModel;
    await storage.setItem('models', models);
    commit('updateDbModels', cloneDeep(models));
  },

  async createGeometry({ state, commit, dispatch }, geometry) {
    const { id, structureSize } = await socket.request('create_geometry', geometry.getRaw());
    geometry.removeRawMesh();
    geometry.id = id;
    geometry.meta.structures.forEach((structure) => {
      structure.size = structureSize[structure.name];
    });

    commit('setGeometry', geometry);
    dispatch('saveModel');
    dispatch('setStructParamsFromGeometry');
  },

  removeGeometry({ commit }) {
    commit('removeGeometry');
  },

  setStructParamsFromGeometry({ state, commit }) {
    const { structures } = state.model.geometry.meta;
    structures.forEach((geomStruct) => {
      const modelStructIdx = state.model.structures.findIndex((s) => s.name === geomStruct.name);
      if (modelStructIdx === -1) return;

      commit('modifyEntity', {
        type: 'structure',
        entityIndex: modelStructIdx,
        keyName: 'geometryStructureSize',
        value: geomStruct.size.toPrecision(5),
      });

      commit('modifyEntity', {
        type: 'structure',
        entityIndex: modelStructIdx,
        keyName: 'geometryStructureName',
        value: geomStruct.name,
      });

      commit('modifyEntity', {
        type: 'structure',
        entityIndex: modelStructIdx,
        keyName: 'type',
        value: geomStruct.type,
      });
    });
  },

  async loadDbModels({ commit }) {
    const storageModels = await storage.getItem('models');
    const models = storageModels || {};
    commit('updateDbModels', models);
  },

  async deleteDbModel({ state, commit }, model) {
    const models = state.dbModels;
    delete models[model.name];
    await storage.setItem('models', models);
    commit('updateDbModels', cloneDeep(models));
    commit('resetEntitySelection');
  },

  async loadPublicModelByName({ state, dispatch }, modelName) {
    const model = publicModels.find((model) => model.name === modelName);
    if (!model) return;

    dispatch('loadDbModel', model);
  },

  async loadDbModel({ commit, dispatch, state }, dbModel) {
    const model = cloneDeep(dbModel);
    if (model.geometry && !model.geometry.name) {
      model.geometry = await storage.getItem(`geometry:${model.geometry.id}`);
    }

    if (model.geometry && model.geometry.nodes) {
      console.info(`Transforming model ${model.name} to new format`);
      // this is an old format of geometry, needs to be restructured
      // TODO: remove this after 20.10.2019
      model.geometry.parsed = true;
      model.geometry.initialized = false;
      const {
        name,
        annotation,
        id,
        scale,
        structures,
        meshNameRoot,
        freeDiffusionBoundaries,
        nodes,
        faces,
        elements,
      } = model.geometry;

      const restructuredGeometry = {
        name,
        id,
        parsed: true,
        initialized: false,
        description: annotation,
        meta: {
          scale,
          structures,
          meshNameRoot,
          freeDiffusionBoundaries,
        },
        mesh: {
          volume: {
            nodes,
            faces,
            elements,
          },
          surface: {},
        },
      };

      model.geometry = restructuredGeometry;

      const models = { ...state.dbModels };
      const tmpModel = { ...model };
      const geometryId = tmpModel.geometry.id;
      await storage.setItem(`geometry:${geometryId}`, tmpModel.geometry);
      tmpModel.geometry = { id: geometryId };

      models[tmpModel.name] = tmpModel;
      await storage.setItem('models', models);
      commit('updateDbModels', { ...models });
    }

    if (model.simulations) {
      model.simulations.forEach(modelTools.upgradeSimStimulation);
    }

    // TODO: refactor all those switches
    if (model.geometry) {
      model.geometry = ModelGeometry.from(model.geometry);
      await model.geometry.init();
    }

    commit('loadDbModel', model);
    if (model.geometry) {
      dispatch('setStructParamsFromGeometry');
    }

    if (model.public) {
      dispatch('cloneSimulations', model.simulations);
    } else {
      dispatch('getSimulations');
    }
  },

  async exportModel({ state }, exportFormat) {
    const cleanSimulations = state.model.simulations.map((sim) =>
      modelTools.createSimulationTemplate(sim),
    );

    const model = { ...state.model, simulations: cleanSimulations };

    if (model.geometry) {
      model.geometry = model.geometry.getClean();
    }

    if (exportFormat === 'ebngl') {
      const modelBinaryData = encode(model);
      const fileExtension = constants.ModelFormatExtensions[exportFormat];
      saveAs(new Blob([modelBinaryData]), `${state.model.name}.${fileExtension}`);
      return;
    }

    const { fileContent: modelData, error } = await socket.request('get_exported_model', {
      model,
      format: exportFormat,
    });

    if (error) throw new Error(error);

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
    const { simulations } = await socket.request('get_simulations', {
      modelId: state.model.id,
    });
    simulations.forEach(modelTools.upgradeSimStimulation);
    commit('setSimulations', simulations);
  },

  async cloneSimulations({ state, commit }, sampleSimulations) {
    const { simulations: userSimulations } = await socket.request('get_simulations', {
      modelId: state.model.id,
    });
    if (userSimulations.length) {
      userSimulations.forEach(modelTools.upgradeSimStimulation);

      commit('setSimulations', userSimulations);
      return;
    }

    const uid = state.user.id;
    const simulations = sampleSimulations
      .map((sim) => ({
        ...sim,
        userId: uid,
        id: uuidv4(),
        _id: undefined,
      }))
      .map(modelTools.upgradeSimStimulation);

    simulations.forEach((sim) => socket.send('create_simulation', sim));
    commit('setSimulations', simulations);
  },

  runSimulation({ state, commit }, simulation) {
    commit('setSimulationStatusById', {
      id: simulation.id,
      status: constants.SimStatus.READY_TO_RUN,
    });
    commit('setEntitySelectionProp', {
      propName: 'status',
      value: constants.SimStatus.READY_TO_RUN,
    });

    const model = { ...state.model };
    delete model.simulations;

    if (model.geometry) {
      model.geometry = { id: model.geometry.id };
    }

    const simConfig = {
      simId: simulation.id,
      userId: state.user.id,
      model,
      ...simulation,
    };

    socket.send('run_simulation', simConfig);
  },

  cancelSimulation({ state }, simulation) {
    // TODO: remove userId from request
    const simConfig = {
      id: simulation.id,
      userId: state.user.id,
    };

    socket.send('cancel_simulation', simConfig);
  },

  clearModel({ commit }) {
    commit('setModel', cloneDeep(constants.defaultEmptyModel));
  },

  async importExcelRevisionFile({ dispatch, state }, { name, fileContent, targetConcSource }) {
    // TODO: refactor

    const encodedTableData = arrayBufferToBase64(fileContent);

    const revision = await socket.request('revision_from_excel', encodedTableData);

    /**
     * Align generated model with revision structuren which has multiple concentrations,
     * using targetConcSource
     * TODO: make this a part of modelBuilder
     */
    revision.species.forEach((species) => {
      const concValue = species.concentration;
      species.concentration = state.revision.config.concSources.reduce(
        (acc, s) => Object.assign(acc, { [s]: s === targetConcSource ? concValue : '0' }),
        {},
      );
    });

    dispatch('mergeRevision', {
      revisionData: revision,
      source: `file:${name}`,
    });
  },

  async importRevisionFile({ dispatch, state }, { name, type, fileContent, targetConcSource }) {
    // TODO: DRY
    let revision = null;
    let bnglStr = null;

    if (type === 'bngl') {
      bnglStr = fileContent;
    } else if (type === 'sbml') {
      const translationResult = await socket.request('convert_from_sbml', {
        sbml: fileContent,
      });
      bnglStr = translationResult.bngl;
      if (!bnglStr) throw new Error('Error in SBML translation');
    } else if (type === 'xlsx') {
      await dispatch('importExcelRevisionFile', {
        name,
        fileContent,
        targetConcSource,
      });
      return;
    }

    try {
      revision = buildFromBngl(bnglStr);
    } catch (e) {
      Sentry.configureScope((scope) => {
        scope.setExtra('bnglModel', bnglStr);
        scope.setExtra('importSource', type);
      });
      Sentry.captureEvent('bnglImportError');
      throw new Error('Error while parsing BNGL');
    }

    /**
     * Align generated model with revision structuren which has multiple concentrations,
     * using targetConcSource
     * TODO: make this a part of modelBuilder
     */
    revision.species.forEach((species) => {
      const concValue = species.concentration;
      species.concentration = state.revision.config.concSources.reduce(
        (acc, s) => Object.assign(acc, { [s]: s === targetConcSource ? concValue : '0' }),
        {},
      );
    });

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
      try {
        model = decode(fileContent);
      } catch (error) {
        model = JSON.parse(fileContent);
      }

      /** ####################### START OF TEMPORARY BLOCK ###################### */
      if (model.geometry) {
        if (model.geometry.nodes) {
          console.info(`Transforming model ${model.name} to new format`);
          // this is an old format of geometry, needs to be restructured
          // TODO: remove this after 20.10.2019
          model.geometry.parsed = true;
          model.geometry.initialized = false;
          const {
            name,
            annotation,
            id,
            scale,
            structures,
            meshNameRoot,
            freeDiffusionBoundaries,
            nodes,
            faces,
            elements,
          } = model.geometry;

          const restructuredGeometry = {
            name,
            id,
            parsed: true,
            initialized: false,
            description: annotation,
            meta: {
              scale,
              structures,
              meshNameRoot,
              freeDiffusionBoundaries,
            },
            mesh: {
              volume: {
                nodes,
                faces,
                elements,
              },
              surface: {},
            },
          };

          model.geometry = restructuredGeometry;
        }

        if (!model.structures[0].geometryStructureName) {
          const { structures } = model.geometry.meta;
          structures.forEach((geomStruct) => {
            const modelStruct = model.structures.find((s) => s.name === geomStruct.name);
            if (!modelStruct) return;

            modelStruct.geometryStructureSize = geomStruct.size.toPrecision(5);
            modelStruct.geometryStructureName = geomStruct.name;
            modelStruct.type = geomStruct.type;
          });
        }

        model.geometry = ModelGeometry.from(model.geometry);
        await model.geometry.init();
      }
      /** ####################### END OF TEMPORARY BLOCK ###################### */

      const simFreeModel = { id: uuidv4(), ...model, simulations: [] };
      commit('setModel', simFreeModel);

      dispatch('cloneSimulations', model.simulations);
      return;
    }

    if (type === 'bngl') {
      bnglStr = fileContent;
    } else if (type === 'sbml') {
      const translationResult = await socket.request('convert_from_sbml', {
        sbml: fileContent,
      });
      bnglStr = translationResult;
      if (!bnglStr) throw new Error('Error in SBML translation');
    }

    try {
      model = buildFromBngl(bnglStr);
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
    commit('updateRepoQueryConfig', queryResult);
    commit('setRepoQueryResult', queryResult);
  },

  saveRevision({ state }) {
    return socket.request('save_revision', state.revision);
  },

  async mergeRevisionWithModel({ commit }, { version, concSource }) {
    const { branch, revision } = version;

    if (revision !== 'latest') {
      commit('mergeRevisionWithModel', { branch, revision, concSource });
      return;
    }

    const { rev: latestRev } = await socket.request('get_branch_latest_rev', branch);
    commit('mergeRevisionWithModel', {
      branch,
      revision: latestRev,
      concSource,
    });
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
