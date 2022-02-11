import Vue from 'vue'
import Vuex from 'vuex'

import state from './state'
import mutations from './mutations'
import actions from './actions'
import getters from './getters'

Vue.use(Vuex)

export default new Vuex.Store<typeof state>({
  state,
  mutations: mutations as any,
  actions,
  getters,
  strict: process.env.NODE_ENV !== 'production',
})
