
import 'iview/dist/styles/iview.css';

import Vue from 'vue';
import iView from 'iview';
import locale from 'iview/dist/locale/en-US';

import './services/sentry';

import App from './App.vue';
import initFilters from './filters';

Vue.use(iView, { locale });
initFilters();

Vue.config.productionTip = true;

new Vue({
  render: h => h(App),
}).$mount('#app');
