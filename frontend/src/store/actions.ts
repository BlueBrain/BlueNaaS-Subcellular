//@ts-nocheck
import cloneDeep from 'lodash/cloneDeep'
import pick from 'lodash/pick'
import saveAs from 'file-saver'
import uuidv4 from 'uuid/v4'
import { decode, encode } from '@msgpack/msgpack'
import { post, get } from '@/services/api'

import * as Sentry from '@sentry/browser'

import buildFromBngl from '@/services/model-builder'
import ModelGeometry from '@/services/model-geometry'
import storage from '@/services/storage'
import socket from '@/services/websocket'
import { removeSimulation } from '@/services/sim-data-storage'
import constants from '@/constants'
import modelTools from '@/tools/model-tools'
import arrayBufferToBase64 from '@/tools/array-buffer-to-base64'
import { User } from '@/types'
import { post } from '@/services/api'

const defaultSim = {
  valid: true,
  status: 'created',
  name: 'Main STEPS example with stimuli',
  progress: null,
  solver: 'tetexact',
  solverConf: {
    valid: true,
    dt: 0.01,
    tEnd: 10,
    stimuli: [
      {
        t: 0.1,
        type: 'setParam',
        target: 'kCa',
        value: 1,
      },
      {
        t: 0.105,
        type: 'setParam',
        target: 'kCa',
        value: 0,
      },
      {
        t: 0.3,
        type: 'setParam',
        target: 'kCa',
        value: 1,
      },
      {
        t: 0.302,
        type: 'setParam',
        target: 'kCa',
        value: 0,
      },
      {
        t: 0.5,
        type: 'setParam',
        target: 'kCa',
        value: 1,
      },
      {
        t: 0.502,
        type: 'setParam',
        target: 'kCa',
        value: 0,
      },
      {
        t: 0.7,
        type: 'setParam',
        target: 'kCa',
        value: 1,
      },
      {
        t: 0.702,
        type: 'setParam',
        target: 'kCa',
        value: 0,
      },
      {
        t: 0.9,
        type: 'setParam',
        target: 'kCa',
        value: 1,
      },
      {
        t: 0.902,
        type: 'setParam',
        target: 'kCa',
        value: 0,
      },
      {
        t: 1.1,
        type: 'setParam',
        target: 'kCa',
        value: 1,
      },
      {
        t: 1.102,
        type: 'setParam',
        target: 'kCa',
        value: 0,
      },
    ],
    spatialSampling: {
      enabled: false,
      structures: [],
      observables: [],
    },
  },

  annotation: '',
}

export default {
  async init({ dispatch }) {
    let user = await storage.getItem('user')
    let userId = user?.id

    if (!userId) {
      userId = uuidv4()
      await post<{ success: true }, User>('users', { id: userId })
    }

    user = (await get<User>(`users/${userId}`, { user_id: userId }))?.data
    await storage.setItem('user', user)
    dispatch('setUser', user)
    socket.userId = user.id
    socket.init()
  },

  setUser({ commit }, user) {
    storage.setItem('user', user)
    commit('setUser', user)
  },

  removeSelectedSimulation({ state, dispatch }) {
    removeSimulation(state.selectedEntity.entity.id)
    socket.send('delete_simulation', state.selectedEntity.entity)
    dispatch('removeSelectedEntity')
  },

  removeSelectedEntity({ state, commit }) {
    commit('removeSelectedEntity')
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
      ])
      socket.send('update_simulation', simUpdateObj)
    }

    commit('modifySelectedEntity', entity)
  },

  async exportModel({ state }, exportFormat) {
    const cleanSimulations = state.model.simulations.map((sim) => modelTools.createSimulationTemplate(sim))

    const model = { ...state.model, simulations: cleanSimulations }

    if (model.geometry) {
      model.geometry = model.geometry.getClean()
    }

    if (exportFormat === 'ebngl') {
      const modelBinaryData = encode(model)
      const fileExtension = constants.ModelFormatExtensions[exportFormat]
      saveAs(new Blob([modelBinaryData]), `${state.model.name}.${fileExtension}`)
      return
    }

    const { fileContent: modelData, error } = await socket.request('get_exported_model', {
      model,
      format: exportFormat,
    })

    if (error) throw new Error(error)

    const fileExtension = constants.ModelFormatExtensions[exportFormat]
    saveAs(new Blob([modelData]), `${state.model.name}.${fileExtension}`)
  },

  addSimulation({ commit }, simulation) {
    commit('addSimulation', simulation)
    commit('setEntitySelection', {
      type: 'simulation',
      entity: simulation,
    })
    socket.send('create_simulation', simulation)
  },

  async getSimulations({ dispatch, state, commit }) {
    const { simulations } = await socket.request('get_simulations', {
      modelId: state.model.id,
    })

    commit('setSimulations', simulations)

    if (simulations.length === 0 && state.user?.id && state.model?.id) {
      const sim = { ...defaultSim, id: uuidv4(), modelId: state.model.id, userId: state.user.id }
      dispatch('addSimulation', modelTools.upgradeSimStimulation(sim))
    }
  },

  async cloneSimulations({ state, commit }, sampleSimulations) {
    const { simulations: userSimulations } = await socket.request('get_simulations', {
      modelId: state.model.id,
    })
    if (userSimulations.length) {
      userSimulations.forEach(modelTools.upgradeSimStimulation)

      commit('setSimulations', userSimulations)
      return
    }

    const uid = state.user.id
    const simulations = sampleSimulations
      .map((sim) => ({
        ...sim,
        userId: uid,
        id: uuidv4(),
        _id: undefined,
      }))
      .map(modelTools.upgradeSimStimulation)

    simulations.forEach((sim) => socket.send('create_simulation', sim))
    commit('setSimulations', simulations)
  },

  runSimulation({ state, commit }, simulation) {
    // commit('setSimulationStatusById', {
    //   id: simulation.id,
    //   status: constants.SimStatus.READY_TO_RUN,
    // })
    // commit('setEntitySelectionProp', {
    //   propName: 'status',
    //   value: constants.SimStatus.READY_TO_RUN,
    // })

    const simConfig = {
      simId: simulation.id,
      userId: state.user.id,
      ...simulation,
    }

    socket.send('run_simulation', simConfig)
  },

  cancelSimulation({ state }, simulation) {
    // TODO: remove userId from request
    const simConfig = {
      id: simulation.id,
      userId: state.user.id,
    }

    socket.send('cancel_simulation', simConfig)
  },

  clearModel({ commit }) {
    commit('setModel', cloneDeep(constants.defaultEmptyModel))
  },

  async importExcelRevisionFile({ dispatch, state }, { name, fileContent, targetConcSource }) {
    // TODO: refactor

    const encodedTableData = arrayBufferToBase64(fileContent)

    const revision = await socket.request('revision_from_excel', encodedTableData)

    /**
     * Align generated model with revision structuren which has multiple concentrations,
     * using targetConcSource
     * TODO: make this a part of modelBuilder
     */
    revision.species.forEach((species) => {
      const concValue = species.concentration
      species.concentration = state.revision.config.concSources.reduce(
        (acc, s) => Object.assign(acc, { [s]: s === targetConcSource ? concValue : '0' }),
        {}
      )
    })

    dispatch('mergeRevision', {
      revisionData: revision,
      source: `file:${name}`,
    })
  },

  async importRevisionFile({ dispatch, state }, { name, type, fileContent, targetConcSource }) {
    // TODO: DRY
    let revision = null
    let bnglStr = null

    if (type === 'bngl') {
      bnglStr = fileContent
    } else if (type === 'sbml') {
      const translationResult = await socket.request('convert_from_sbml', {
        sbml: fileContent,
      })
      bnglStr = translationResult.bngl
      if (!bnglStr) throw new Error('Error in SBML translation')
    } else if (type === 'xlsx') {
      await dispatch('importExcelRevisionFile', {
        name,
        fileContent,
        targetConcSource,
      })
      return
    }

    try {
      revision = buildFromBngl(bnglStr)
    } catch (e) {
      Sentry.configureScope((scope) => {
        scope.setExtra('bnglModel', bnglStr)
        scope.setExtra('importSource', type)
      })
      Sentry.captureEvent('bnglImportError')
      throw new Error('Error while parsing BNGL')
    }

    /**
     * Align generated model with revision structuren which has multiple concentrations,
     * using targetConcSource
     * TODO: make this a part of modelBuilder
     */
    revision.species.forEach((species) => {
      const concValue = species.concentration
      species.concentration = state.revision.config.concSources.reduce(
        (acc, s) => Object.assign(acc, { [s]: s === targetConcSource ? concValue : '0' }),
        {}
      )
    })

    dispatch('mergeRevision', {
      revisionData: revision,
      source: `file:${name}`,
    })
  },

  async importModel({ commit, dispatch }, { modelName, type, fileContent }) {
    let model = null
    let bnglStr = null

    if (type === 'ebngl') {
      // TODO: add content type and schema validation
      try {
        model = decode(fileContent)
      } catch (error) {
        model = JSON.parse(fileContent)
      }

      /** ####################### START OF TEMPORARY BLOCK ###################### */
      if (model.geometry) {
        if (model.geometry.nodes) {
          console.info(`Transforming model ${model.name} to new format`)
          // this is an old format of geometry, needs to be restructured
          // TODO: remove this after 20.10.2019
          model.geometry.parsed = true
          model.geometry.initialized = false
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
          } = model.geometry

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
          }

          model.geometry = restructuredGeometry
        }

        if (!model.structures[0].geometryStructureName) {
          const { structures } = model.geometry.meta
          structures.forEach((geomStruct) => {
            const modelStruct = model.structures.find((s) => s.name === geomStruct.name)
            if (!modelStruct) return

            modelStruct.geometryStructureSize = geomStruct.size.toPrecision(5)
            modelStruct.geometryStructureName = geomStruct.name
            modelStruct.type = geomStruct.type
          })
        }

        model.geometry = ModelGeometry.from(model.geometry)
        await model.geometry.init()
      }
      /** ####################### END OF TEMPORARY BLOCK ###################### */

      const simFreeModel = { id: uuidv4(), ...model, simulations: [] }
      commit('setModel', simFreeModel)

      dispatch('cloneSimulations', model.simulations)
      return
    }

    if (type === 'bngl') {
      bnglStr = fileContent
    } else if (type === 'sbml') {
      const translationResult = await socket.request('convert_from_sbml', {
        sbml: fileContent,
      })
      bnglStr = translationResult
      if (!bnglStr) throw new Error('Error in SBML translation')
    }

    try {
      model = buildFromBngl(bnglStr)
    } catch (e) {
      Sentry.configureScope((scope) => {
        scope.setExtra('bnglModel', bnglStr)
        scope.setExtra('importSource', type)
      })
      Sentry.captureEvent('bnglImportError')
      throw new Error('Error while parsing BNGL')
    }

    model.name = modelName
    commit('setModel', model)
  },

  async queryMolecularRepo({ commit }, query) {
    const { queryResult } = await socket.request('query_molecular_repo', query)
    commit('updateRepoQueryConfig', queryResult)
    commit('setRepoQueryResult', queryResult)
  },

  saveRevision({ state }) {
    return socket.request('save_revision', state.revision)
  },

  async mergeRevisionWithModel({ commit }, { version, concSource }) {
    const { branch, revision } = version

    if (revision !== 'latest') {
      commit('mergeRevisionWithModel', { branch, revision, concSource })
      return
    }

    const { rev: latestRev } = await socket.request('get_branch_latest_rev', branch)
    commit('mergeRevisionWithModel', {
      branch,
      revision: latestRev,
      concSource,
    })
  },

  async importRevision({ commit }, params) {
    const { revision } = await socket.request('get_revision', params)
    commit('mergeRevision', {
      source: `rev:${params.branch}:${params.revision}`,
      revisionData: revision,
    })
    commit('validateRevision')
  },

  mergeRevision({ commit }, { source, revisionData }) {
    commit('mergeRevision', { source, revisionData })
    commit('validateRevision')
  },

  updateRevisionEntity({ commit }, { type, entity }) {
    commit('updateRevisionEntity', { type, entity })
    commit('validateRevision')
  },

  removeRevisionEntities({ commit }, { type, entities }) {
    commit('removeRevisionEntities', { type, entities })
    commit('validateRevision')
  },

  setRepoQueryHighlightVersionKey({ commit }, versionKey) {
    commit('setRepoQueryHighlightVersionKey', versionKey)
    commit('updateRepoQueryEntityStyles')
  },

  renameRevConcSource({ commit }, { sourceIndex, newSource }) {
    commit('renameRevConcSource', { sourceIndex, newSource })
    commit('updateRevVisibleConcSources')
    commit('validateRevision')
  },

  removeRevConcSource({ commit }, sourceIndex) {
    commit('removeRevConcSource', sourceIndex)
    commit('updateRevVisibleConcSources')
    commit('validateRevision')
  },

  addRevConcSource({ commit }, concSource) {
    commit('addRevConcSource', concSource)
    commit('updateRevVisibleConcSources')
    commit('validateRevision')
  },
}
