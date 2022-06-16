import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

export default new VueRouter({
  mode: 'history',
  routes: [
    {
      path: '/model',
      component: () =>
        import(
          /* webpackChunkName: "model-meta" */
          './components/model-page/primary-view/model-meta.vue'
        ),
    },
    {
      path: '/geometry',
      component: () =>
        import(
          /* webpackChunkName: "model-geometry" */
          './components/model-page/primary-view/geometry.vue'
        ),
    },
    {
      path: '/load-model',
      component: () =>
        import(
          /* webpackChunkName: "model-geometry" */
          './components/model-page/secondary-view/db-model.vue'
        ),
    },
    {
      path: '/simulations',
      component: () =>
        import(
          /* webpackChunkName: "model-simulations" */
          './components/model-page/primary-view/simulations.vue'
        ),
    },
    {
      path: `/structures`,
      component: () =>
        import(
          /* webpackChunkName: "model-structures" */
          './components/model-page/primary-view/structures.vue'
        ),
    },
    {
      path: `/parameters`,
      component: () =>
        import(
          /* webpackChunkName: "model-parameters" */
          './components/model-page/primary-view/parameters.vue'
        ),
    },
    {
      path: '/functions',
      component: () =>
        import(
          /* webpackChunkName: "model-functions" */
          './components/model-page/primary-view/functions.vue'
        ),
    },
    {
      path: '/molecules',
      component: () =>
        import(
          /* webpackChunkName: "model-molecules" */
          './components/model-page/primary-view/molecules.vue'
        ),
    },
    {
      path: '/species',
      component: () =>
        import(
          /* webpackChunkName: "model-species" */
          './components/model-page/primary-view/species.vue'
        ),
    },
    {
      path: '/observables',
      component: () =>
        import(
          /* webpackChunkName: "model-observables" */
          './components/model-page/primary-view/observables.vue'
        ),
    },
    {
      path: '/reactions',
      component: () =>
        import(
          /* webpackChunkName: "model-reactions" */
          './components/model-page/primary-view/reactions.vue'
        ),
    },
    {
      path: '/diffusions',
      component: () =>
        import(
          /* webpackChunkName: "model-diffusions" */
          './components/model-page/primary-view/diffusions.vue'
        ),
    },
    {
      path: '/viz',
      component: () =>
        import(
          /* webpackChunkName: "model-viz" */
          './components/viz.vue'
        ),
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
      redirect: '/model',
    },
  ],
})
