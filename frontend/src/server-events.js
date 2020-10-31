import store from './store'
import bus from './services/event-bus'

bus.$on('ws:simStatus', (simStatus) => {
  store.commit('setSimStatus', simStatus)
})

bus.$on('ws:simProgress', (simProgress) => {
  store.commit('setSimProgress', simProgress)
})

bus.$on('ws:trace', (simTrace) => {
  store.commit('addSimTrace', simTrace)
})
