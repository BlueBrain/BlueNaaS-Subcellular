import Vue from 'vue';
import VueRouter from 'vue-router';

import constants from './constants';

const { EntityType } = constants;

Vue.use(VueRouter);

export default new VueRouter({
  mode: 'history',
  routes: [
    {
      path: '/model/',
      component: () =>
        import(
          /* webpackChunkName: "model" */
          './components/model-page.vue'
        ),
      children: [
        {
          path: 'meta',
          component: () =>
            import(
              /* webpackChunkName: "model-meta" */
              './components/model-page/primary-view/model-meta.vue'
            ),
        },
        {
          path: 'simulations',
          component: () =>
            import(
              /* webpackChunkName: "model-simulations" */
              './components/model-page/primary-view/simulations.vue'
            ),
        },
        {
          path: `${EntityType.STRUCTURE}s`,
          component: () =>
            import(
              /* webpackChunkName: "model-structures" */
              './components/model-page/primary-view/structures.vue'
            ),
        },
        {
          path: `${EntityType.PARAMETER}s`,
          component: () =>
            import(
              /* webpackChunkName: "model-parameters" */
              './components/model-page/primary-view/parameters.vue'
            ),
        },
        {
          path: `${EntityType.FUNCTION}s`,
          component: () =>
            import(
              /* webpackChunkName: "model-functions" */
              './components/model-page/primary-view/functions.vue'
            ),
        },
        {
          path: `${EntityType.MOLECULE}s`,
          component: () =>
            import(
              /* webpackChunkName: "model-molecules" */
              './components/model-page/primary-view/molecules.vue'
            ),
        },
        {
          path: EntityType.SPECIES,
          component: () =>
            import(
              /* webpackChunkName: "model-species" */
              './components/model-page/primary-view/species.vue'
            ),
        },
        {
          path: `${EntityType.OBSERVABLE}s`,
          component: () =>
            import(
              /* webpackChunkName: "model-observables" */
              './components/model-page/primary-view/observables.vue'
            ),
        },
        {
          path: `${EntityType.REACTION}s`,
          component: () =>
            import(
              /* webpackChunkName: "model-reactions" */
              './components/model-page/primary-view/reactions.vue'
            ),
        },
        {
          path: `${EntityType.DIFFUSION}s`,
          component: () =>
            import(
              /* webpackChunkName: "model-diffusions" */
              './components/model-page/primary-view/diffusions.vue'
            ),
        },
        {
          path: EntityType.GEOMETRY,
          component: () =>
            import(
              /* webpackChunkName: "model-geometry" */
              './components/model-page/primary-view/geometry.vue'
            ),
        },
      ],
    },
    {
      path: '/molecular-repo',
      component: () =>
        import(
          /* webpackChunkName: "molecule-db" */
          './components/molecular-repo-page.vue'
        ),
    },
    {
      path: '*',
      redirect: '/model/meta',
    },
  ],
});
