import Vue from 'vue'

import normalizeNumber from './normalize-number'

function initFilters() {
  Vue.filter('normalizeNumber', normalizeNumber)
}

export default initFilters
