import store from './store';
import bus from './services/event-bus';

bus.$on('ws:simStatus', (simStatus) => {
  store.commit('setSimStatus', simStatus);
});

bus.$on('ws:simProgress', (simProgress) => {
  store.commit('setSimProgress', simProgress);
});

bus.$on('ws:contact-map', (contactMap) => {
  store.commit('setContactMap', contactMap);
});

bus.$on('ws:reactivity-network', (reactivityNetwork) => {
  store.commit('setReactivityNetwork', reactivityNetwork);
});
