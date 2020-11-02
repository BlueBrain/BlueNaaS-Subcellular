import Vue from 'vue'
import get from 'lodash/get'
import cloneDeep from 'lodash/cloneDeep'

import constants from '@/constants'
import ModelValidator from '@/tools/model-validator'

const { entityTypeCollectionMap, defaultEmptyModel, DEFAULT_VISIBLE_CONC_N_PER_REV } = constants

const collectionNames = [
  'structures',
  'molecules',
  'species',
  'reactions',
  'diffusions',
  'functions',
  'observables',
  'parameters',
]

export default {
  setUser(state, user) {
    state.user = user
  },

  setNonBnglStructures(state, value) {
    state.model.nonBnglStructures = value
  },

  setGeometry(state, geometry) {
    state.model.geometry = geometry
  },

  removeGeometry(state) {
    state.model.geometry = null

    // reset geometry related structures' properties
    state.model.structures.forEach((structure) => {
      structure.geometryStructureSize = ''
      structure.geometryStructureName = ''
    })
  },

  addStructure(state, structure) {
    state.model.structures.push(structure)
  },

  addParameter(state, parameter) {
    state.model.parameters.push(parameter)
  },

  addFunction(state, fn) {
    state.model.functions.push(fn)
  },

  addMolecule(state, molecule) {
    state.model.molecules.push(molecule)
  },

  addSpecies(state, species) {
    state.model.species.push(species)
  },

  addReaction(state, reaction) {
    state.model.reactions.push(reaction)
  },

  addObservable(state, observable) {
    state.model.observables.push(observable)
  },

  addDiffusion(state, diffusion) {
    state.model.diffusions.push(diffusion)
  },

  addSimulation(state, simulation) {
    state.model.simulations.push(simulation)
  },

  addEntity(state, entityType, entity) {
    state.model[entityTypeCollectionMap[entityType]].push(entity)
  },

  setSimulationStatusById(state, { id: simId, status }) {
    const simulationIndex = state.model.simulations.map((simulation) => simulation.id).indexOf(simId)
    Vue.set(state.model.simulations[simulationIndex], 'status', status)
  },

  setSimProgress(state, { simId, progress }) {
    const simIndex = state.model.simulations.map((simulation) => simulation.id).indexOf(simId)

    const currentSim = state.model.simulations[simIndex]
    const simulation = Object.assign({}, currentSim, { progress })

    Vue.set(state.model.simulations, simIndex, simulation)
  },

  setSimStatus(state, status) {
    // TODO: deprecate in favor of upper one
    const simIndex = state.model.simulations.map((sim) => sim.id).indexOf(status.simId)

    const currentSim = state.model.simulations[simIndex]
    const simulation = Object.assign({}, currentSim, status)

    Vue.set(state.model.simulations, simIndex, simulation)

    // TODO: consider refactoring .selectedEntity
    if (get(state, 'selectedEntity.entity.id') === status.simId) {
      Vue.set(state.selectedEntity, 'entity', cloneDeep(simulation))
    }
  },

  setSimulations(state, simulations) {
    Vue.set(state.model, 'simulations', simulations)
  },

  setEntitySelection(state, { type, entity, index }) {
    state.selectedEntity = {
      type,
      index,
      entity,
    }
  },

  setEntitySelectionProp(state, { propName, value }) {
    Vue.set(state.selectedEntity.entity, propName, value)
  },

  resetEntitySelection(state) {
    state.selectedEntity = null
  },

  modifySelectedEntity(state, modifiedEntityReactiveObj) {
    const modifiedEntity = Object.assign({}, modifiedEntityReactiveObj)
    const entityCollection = entityTypeCollectionMap[state.selectedEntity.type]
    Vue.set(state.model[entityCollection], state.selectedEntity.index, modifiedEntity)
    Vue.set(state.selectedEntity, 'entity', modifiedEntity)
  },

  modifyEntity(state, { type, entityIndex, keyName, value }) {
    Vue.set(state.model[entityTypeCollectionMap[type]][entityIndex], keyName, value)
  },

  removeSelectedEntity(state) {
    const entityCollection = entityTypeCollectionMap[state.selectedEntity.type]
    const { index } = state.selectedEntity
    state.model[entityCollection].splice(index, 1)

    state.selectedEntity = null
  },

  updateModelName(state, name) {
    state.model.name = name
  },

  updateModelAnnotation(state, annotation) {
    state.model.annotation = annotation
  },

  updateDbModels(state, models) {
    state.dbModels = models
  },

  loadDbModel(state, model) {
    state.model = Object.assign({}, defaultEmptyModel, model)
  },

  setModel(state, model) {
    state.model = model
  },

  addToModel(state, modelDiff) {
    const entities = ['structures', 'parameters', 'functions', 'molecules', 'species', 'observables', 'reactions']
    entities.forEach((entity) => {
      state.model[entity] = state.model[entity].concat(modelDiff[entity])
    })
  },

  resetMolecularRepo(state) {
    state.repoQueryResult = null
  },

  setRepoQueryResult(state, queryResult) {
    state.repoQueryResult = queryResult
  },

  updateRepoQueryConfig(state, queryResult) {
    const concSourceSet = new Set()
    queryResult.species.forEach((species) => {
      Object.keys(species.concentration).forEach((concSource) => concSourceSet.add(concSource))
    })
    const concSources = Array.from(concSourceSet)
    state.repoQueryConfig.concSources = concSources
    state.repoQueryConfig.visibleConcSources = concSources.slice(0, DEFAULT_VISIBLE_CONC_N_PER_REV)
  },

  removeRevisionEntities(state, { type, entities }) {
    const collection = state.revision[entityTypeCollectionMap[type]]
    entities.forEach((entity) => {
      const index = collection.findIndex((e) => e.entityId === entity.entityId)
      if (index === -1) return

      collection.splice(index, 1)
    })
  },

  removeQueryResultEntities(state, { type, entities }) {
    const collection = state.repoQueryResult[entityTypeCollectionMap[type]]
    entities.forEach((entity) => {
      const index = collection.findIndex((e) => e.entityId === entity.entityId)
      if (index === -1) return

      collection.splice(index, 1)
    })
  },

  updateRevisionEntity(state, { type, entity }) {
    const collectionName = entityTypeCollectionMap[type]
    const collection = state.revision[collectionName]
    const index = entity.entityId
      ? collection.findIndex((e) => e.entityId === entity.entityId)
      : collection.findIndex((e) => e.name === entity.name)
    if (index === -1) {
      collection.push(entity)
    } else {
      Vue.set(collection, index, entity)
    }
  },

  mergeRevision(state, { source, revisionData }) {
    collectionNames.forEach((collName) => {
      revisionData[collName].forEach((entity) => {
        const revisionEntity = Object.assign({}, entity, { source })
        state.revision[collName].push(revisionEntity)
      })
    })

    /**
     * Update revision config with concentration sources
     * and initialise missing concentration values with empty string
     */
    const concSourceSet = new Set()
    state.revision.species.forEach((species) => {
      Object.keys(species.concentration).forEach((s) => concSourceSet.add(s))
    })
    const concSources = Array.from(concSourceSet)
    state.revision.species.forEach((species) => {
      concSources.forEach((s) => {
        if (species.concentration[s] === undefined) species.concentration[s] = ''
      })
    })

    state.revision.config = {
      concSources,
      visibleConcSources: concSources.slice(0, DEFAULT_VISIBLE_CONC_N_PER_REV),
    }
  },

  clearRevisionEditor(state) {
    state.revision = cloneDeep(constants.defaultEmptyRevision)
  },

  updateRevVisibleConcSources(state) {
    const conf = state.revision.config
    conf.visibleConcSources = conf.concSources.slice(0, DEFAULT_VISIBLE_CONC_N_PER_REV)
  },

  mergeRevisionWithModel(state, { branch, revision, concSource }) {
    collectionNames.forEach((collName) => {
      state.repoQueryResult[collName].forEach((entity) => {
        if (entity.branch !== branch || entity.rev !== revision) return

        const modelCollection = state.model[collName]

        // skip already added entities
        if (modelCollection.some((modelEntity) => modelEntity._id === entity._id)) return

        // restructure species' concentrations to a signle value by given concSource
        // TODO: move this logic outside of mutations, eg to modelBuilder class or so.
        const clonedEntity = cloneDeep(entity)
        if (collName === 'species') {
          clonedEntity.concentration = clonedEntity.concentration[concSource]
        }

        state.model[collName].push(clonedEntity)
      })
    })
  },

  setRevisionBranch(state, branch) {
    Vue.set(state.revision, 'branch', branch)
  },

  setRepoQueryHighlightVersionKey(state, versionKey) {
    state.repoQueryHighlightVersionKey = versionKey
  },

  updateRepoQueryEntityStyles(state) {
    collectionNames.forEach((collName) => {
      state.repoQueryResult[collName].forEach((entity) => {
        const style = state.repoQueryHighlightVersionKey === `${entity.branch}:${entity.rev}` ? 'info' : null
        Vue.set(entity, 'style', style)
      })
    })
  },

  setQueryLoading(state, loading) {
    state.revision.loading = loading
  },

  validateRevision(state) {
    const validator = new ModelValidator(state.revision)
    validator.validate()
    state.revision = validator.model
  },

  renameRevConcSource(state, { sourceIndex, newSource }) {
    const currentConcentrationSources = state.revision.config.concSources
    const sourceToRename = currentConcentrationSources[sourceIndex]

    state.revision.species.forEach((species) => {
      const concValue = species.concentration[sourceToRename]
      delete species.concentration[sourceToRename]
      Vue.set(species.concentration, newSource, concValue)
    })

    Vue.set(currentConcentrationSources, sourceIndex, newSource)
  },

  removeRevConcSource(state, sourceIndex) {
    const sourceToRemove = state.revision.config.concSources[sourceIndex]

    state.revision.config.concSources.splice(sourceIndex, 1)
    state.revision.species.forEach((species) => {
      delete species.concentration[sourceToRemove]
    })
  },

  addRevConcSource(state, concSource) {
    state.revision.species.forEach((species) => {
      Vue.set(species.concentration, concSource, '0')
    })
    state.revision.config.concSources.push(concSource)
  },

  setRevisionVisibleConcSources(state, visibleConcSources) {
    Vue.set(state.revision.config, 'visibleConcSources', visibleConcSources)
  },

  setRevisionQueryVisibleConcSources(state, visibleConcSources) {
    Vue.set(state.repoQueryConfig, 'visibleConcSources', visibleConcSources)
  },

  importConcentration(state, { importCollection, concSource }) {
    importCollection.forEach((importObj) => {
      const specEntityId = importObj.species[importObj.specIdx].entityId
      const revSpec = state.revision.species.find((s) => s.entityId === specEntityId)

      const conc = importObj.newConcentrations[importObj.newConcentrationIdx]
      Vue.set(revSpec.concentration, concSource, conc)
    })
  },
}
