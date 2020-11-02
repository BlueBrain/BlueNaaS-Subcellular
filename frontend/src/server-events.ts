import store from './store';
import bus from './services/event-bus';
import { SimStepTrace, SimTrace } from '@/types';

bus.$on('ws:simStatus', (simStatus) => {
  store.commit('setSimStatus', simStatus);
});

bus.$on('ws:simProgress', (simProgress) => {
  store.commit('setSimProgress', simProgress);
});

bus.$on('ws:trace', (simTrace) => {
  store.commit('addSimTrace', simTrace);
});

// bus.$on('ws:simTrace', (simTrace: SimTrace) => {
//   store.commit('addSimTrace', simTrace);
// });

// bus.$on('ws:simStepTrace', (simStepTrace: SimStepTrace) => {
//   store.commit('addSimStepTrace', simStepTrace);
// });
