
import deepClone from 'lodash/cloneDeep';

import constants from '@/constants';

const model = deepClone(constants.defaultEmptyModel);

export default {
  model,
  selectedEntity: null,
  user: {
    id: null,
    fullName: null,
    email: null,
  },
  dbModels: {},
};
