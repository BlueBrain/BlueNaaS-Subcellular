
import store from './storex';
import bus from './services/event-bus';


bus.$on('ws:simTraceMeta', (simTraceMeta) => {
  store.commit('setSimTraceMeta', simTraceMeta);
});

bus.$on('ws:simStepTrace', (simStepTrace) => {
  store.commit('addSimStepTrace', simStepTrace);
});

bus.$on('ws:simTrace', (simTrace) => {
  store.commit('setSimTrace', simTrace);
});

bus.$on('ws:simStatus', (simStatus) => {
  store.commit('setSimStatus', simStatus);
});