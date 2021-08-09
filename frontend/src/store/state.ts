import cloneDeep from 'lodash/cloneDeep';

import constants from '@/constants';
import { State } from '@/types';

const model = cloneDeep(constants.defaultEmptyModel);
const revision = cloneDeep(constants.defaultEmptyRevision);

const state: State = {
  model,
  //@ts-ignore
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
  simTraces: {},
  selectMode: false,
  selectedTetIdxs: [],
};

export default state;
