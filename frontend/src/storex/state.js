
import deepClone from 'lodash/cloneDeep';
import uuidv5 from 'uuid/v5';

import constants from '@/constants';

const model = deepClone(constants.defaultEmptyModel, { id: uuidv5 });
const revision = deepClone(constants.defaultEmptyRevision);

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
  repoQueryHighlightVersionKey: null,
};
