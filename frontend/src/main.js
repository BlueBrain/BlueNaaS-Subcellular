
import 'iview/dist/styles/iview.css';

import Vue from 'vue';
import iView from 'iview';

import App from './App.vue';

Vue.use(iView);

Vue.config.productionTip = true;

new Vue({
  render: h => h(App),
}).$mount('#app');
