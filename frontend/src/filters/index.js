
import Vue from 'vue';

import normalizeNumber from './normalize-number';
import majorProteinName from './major-protein-name';

function initFilters() {
  Vue.filter('normalizeNumber', normalizeNumber);
  Vue.filter('majorProteinName', majorProteinName);
}

export default initFilters;
