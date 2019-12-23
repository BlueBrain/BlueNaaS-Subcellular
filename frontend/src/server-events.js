
import store from './store';
import bus from './services/event-bus';


bus.$on('ws:simStatus', (simStatus) => {
  store.commit('setSimStatus', simStatus);
});
