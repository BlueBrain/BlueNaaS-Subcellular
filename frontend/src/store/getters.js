import constants from '@/constants'

const { SimSolver } = constants

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

class SolverState {
  /**
   * Create solverState instance
   *
   * @param {Boolean} enabled
   * @param {Str} reason
   */
  constructor(enabled, reason = '') {
    this.enabled = enabled
    this.reason = reason
  }
}

function getStepsSolverState(state) {
  if (!state.model.geometry) {
    return new SolverState(false, 'No geometry provided')
  }

  return new SolverState(true)
}

function getNfsimSolverState(state) {
  if (state.model.nonBnglStructures) {
    return new SolverState(false, 'Non compliant BNG structs')
  }

  return new SolverState(true)
}

export default {
  solverState: (state) => (solver) => {
    if (solver === SimSolver.NFSIM) return getNfsimSolverState(state)
    if (solver === SimSolver.STEPS) return getStepsSolverState(state)

    throw new Error(`Unrecognised solver ${solver}`)
  },
  queryResultVersions: (state) => {
    if (!state.repoQueryResult) return []

    const versionMap = new Map()

    collectionNames.forEach((collName) => {
      state.repoQueryResult[collName].forEach((entity) => {
        const key = `${entity.branch}:${entity.rev}`
        if (!versionMap.has(key)) {
          const version = {
            key,
            branch: entity.branch,
            revision: entity.rev,
          }
          versionMap.set(key, version)
        }
      })
    })

    return Array.from(versionMap.values())
  },
  revisionSources: (state) => {
    const sourceSet = new Set()

    collectionNames.forEach((collName) => {
      state.revision[collName].forEach((entity) => {
        sourceSet.add(entity.source)
      })
    })

    return Array.from(sourceSet.values())
  },
}
