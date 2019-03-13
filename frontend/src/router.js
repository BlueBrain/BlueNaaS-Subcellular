
import Vue from 'vue';
import VueRouter from 'vue-router';

import constants from './constants';

import ModelPage from './components/model-page.vue';

import ModelMeta from './components/model-page/primary-view/model-meta.vue';

import StructuresComponent from './components/model-page/primary-view/structures.vue';
import ParametersComponent from './components/model-page/primary-view/parameters.vue';
import FunctionsComponent from './components/model-page/primary-view/functions.vue';
import MoleculesComponent from './components/model-page/primary-view/molecules.vue';
import SpeciesComponent from './components/model-page/primary-view/species.vue';
import ObservablesComponent from './components/model-page/primary-view/observables.vue';
import ReactionsComponent from './components/model-page/primary-view/reactions.vue';
import DiffusionsComponent from './components/model-page/primary-view/diffusions.vue';

import SimulationsComponent from './components/model-page/primary-view/simulations.vue';
import GeometryComponent from './components/model-page/primary-view/geometry.vue';


const { EntityType } = constants;

Vue.use(VueRouter);

export default new VueRouter({
  mode: 'history',
  routes: [{
    path: '/model/',
    component: ModelPage,
    children: [{
      path: 'meta',
      component: ModelMeta,
    }, {
      path: 'simulations',
      component: SimulationsComponent,
    }, {
      path: `${EntityType.STRUCTURE}s`,
      component: StructuresComponent,
    }, {
      path: `${EntityType.PARAMETER}s`,
      component: ParametersComponent,
    }, {
      path: `${EntityType.FUNCTION}s`,
      component: FunctionsComponent,
    }, {
      path: `${EntityType.MOLECULE}s`,
      component: MoleculesComponent,
    }, {
      path: EntityType.SPECIES,
      component: SpeciesComponent,
    }, {
      path: `${EntityType.OBSERVABLE}s`,
      component: ObservablesComponent,
    }, {
      path: `${EntityType.REACTION}s`,
      component: ReactionsComponent,
    }, {
      path: `${EntityType.DIFFUSION}s`,
      component: DiffusionsComponent,
    }, {
      path: EntityType.GEOMETRY,
      component: GeometryComponent,
    }],
  }, {
    path: '/model-builder',
    component: () => import(/* webpackChunkName: "model-builder" */ './components/model-builder.vue'),
  }, {
    path: '*',
    redirect: '/model/meta',
  }],
});
