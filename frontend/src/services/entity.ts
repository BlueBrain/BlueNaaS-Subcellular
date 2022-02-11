// @ts-nocheck
import uuidv4 from 'uuid/v4'

class RevisionEntity {
  constructor() {
    this.entityId = uuidv4()
  }
}

class RevisionStructure extends RevisionEntity {
  constructor() {
    super()

    this.name = null
    this.source = 'userInput'
    this.dimensions = null
    this.uniProtId = null
    this.goId = null
    this.description = null
  }
}

class RevisionMolecule extends RevisionEntity {
  constructor() {
    super()

    this.name = null
    this.source = 'userInput'
    this.definition = ''
    this.dimensions = null
    this.uniProtId = null
    this.goId = null
    this.pubChemId = null
    this.cid = null
    this.geneName = null
    this.description = null
  }
}

class RevisionSpecies extends RevisionEntity {
  constructor(config) {
    super()

    this.name = null
    this.source = 'userInput'
    this.definition = ''

    this.concentration = config.concSources.reduce((acc, source) => Object.assign(acc, { [source]: '' }), {})

    this.units = null
  }
}

class RevisionReaction extends RevisionEntity {
  constructor() {
    super()

    this.name = null
    this.source = 'userInput'
    this.definition = ''
    this.kf = ''
    this.kr = ''
    this.description = null
    this.comments = null
  }
}

class RevisionDiffusion extends RevisionEntity {
  constructor() {
    super()

    this.name = null
    this.source = 'userInput'
    this.definition = ''
    this.rate = ''
    this.units = null
    this.comments = null
  }
}

class RevisionObservable extends RevisionEntity {
  constructor() {
    super()

    this.name = null
    this.source = 'userInput'
    this.definition = ''
  }
}

class RevisionParameter extends RevisionEntity {
  constructor() {
    super()

    this.name = null
    this.source = 'userInputn'
    this.definition = ''
    this.references = null
    this.comments = null
  }
}

class RevisionFunction extends RevisionEntity {
  constructor() {
    super()

    this.name = null
    this.source = 'userInput'
    this.definition = ''
    this.units = null
    this.references = null
    this.comments = null
  }
}

export default {
  RevisionStructure,
  RevisionMolecule,
  RevisionSpecies,
  RevisionReaction,
  RevisionDiffusion,
  RevisionObservable,
  RevisionParameter,
  RevisionFunction,
}
