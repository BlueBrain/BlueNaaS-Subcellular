
import 'iview/dist/styles/iview.css';

import Vue from 'vue';
import iView from 'iview';
import locale from 'iview/dist/locale/en-US';

import './services/sentry';

import App from './App.vue';
import initFilters from './filters';
import store from './store';
import router from './router';

Vue.use(iView, { locale, size: 'small' });
initFilters();

Vue.config.productionTip = true;

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app');
