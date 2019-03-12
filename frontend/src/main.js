
import 'iview/dist/styles/iview.css';

import Vue from 'vue';
import iView from 'iview';
import locale from 'iview/dist/locale/en-US';

import './services/sentry';

import App from './App.vue';
import initFilters from './filters';
import storex from './storex';

Vue.use(iView, { locale });
initFilters();

Vue.config.productionTip = true;

new Vue({
  render: h => h(App),
  store: storex,
}).$mount('#app');
