import 'view-design/dist/styles/iview.css';

import Vue from 'vue';
import ViewUI from 'view-design';
import locale from 'view-design/dist/locale/en-US';

import './services/sentry';

import App from './App.vue';
import initFilters from './filters';
import store from './store';
import router from './router';

Vue.use(ViewUI, { locale, size: 'small' });
initFilters();

Vue.config.productionTip = true;

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app');
