
import 'iview/dist/styles/iview.css';

import Vue from 'vue';
import iView from 'iview';
import locale from 'iview/dist/locale/en-US';

import './services/sentry';

import App from './App.vue';
import initFilters from './filters';
import storex from './storex';
import router from './router';

Vue.use(iView, { locale, size: 'small' });
initFilters();

Vue.config.productionTip = true;

new Vue({
  router,
  render: h => h(App),
  store: storex,
}).$mount('#app');
