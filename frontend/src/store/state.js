import cloneDeep from 'lodash/cloneDeep'
import uuidv5 from 'uuid/v5'

import constants from '@/constants'

const model = cloneDeep(constants.defaultEmptyModel, { id: uuidv5 })
const revision = cloneDeep(constants.defaultEmptyRevision)

export default {
  model,
  revision,
  selectedEntity: null,
  user: {
    id: null,
    fullName: null,
    email: null,
  },
  dbModels: {},
  repoQueryResult: null,
  repoQueryConfig: {
    concSources: ['default'],
    visibleConcSources: ['default'],
  },
  repoQueryHighlightVersionKey: null,
}
