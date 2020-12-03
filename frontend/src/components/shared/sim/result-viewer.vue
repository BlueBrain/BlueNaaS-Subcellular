<template>
  <div class="h-100 pos-relative">
    <div v-if="spatialViewerAvailable" class="ctrl">
      <i-select v-model="currentViewKey" @on-change="onViewChange">
        <i-option v-for="(viewLabel, viewKey) in view" :key="viewKey" :value="viewKey">{{
          viewLabel
        }}</i-option>
      </i-select>
    </div>

    <temporal-result-viewer
      v-if="currentViewKey === 'temporal'"
      id="temporal-result-viewer"
      :sim-id="simId"
    />

    <spatial-result-viewer
      v-else-if="currentViewKey === 'spatial'"
      id="spatial-result-viewer"
      :sim-id="simId"
    />

    <Split
      v-else-if="currentViewKey === 'allHorizontal'"
      v-model="split.vertical"
      mode="vertical"
      min="350px"
      max="350px"
      @on-move-end="emitResize"
      @on-moving="emitResize"
    >
      <div slot="top" class="h-100 pos-relative">
        <temporal-result-viewer :sim-id="simId" id="temporal-result-viewer" />
      </div>
      <div slot="bottom" class="h-100 pos-relative">
        <spatial-result-viewer :sim-id="simId" id="spatial-result-viewer" />
      </div>
    </Split>
  </div>
</template>

<script>
  import get from 'lodash/get';

  import constants from '@/constants';
  import TemporalResultViewer from './result-viewer/temporal-result-viewer.vue';
  import SpatialResultViewer from './result-viewer/spatial-result-viewer.vue';

  const { SimSolver } = constants;

  const view = {
    temporal: 'Temporal',
    spatial: 'Spatial',
    allHorizontal: 'Temporal + Spatial',
  };

  export default {
    name: 'result-viewer',
    props: ['simId'],
    components: {
      'spatial-result-viewer': SpatialResultViewer,
      'temporal-result-viewer': TemporalResultViewer,
    },
    data() {
      return {
        view,
        currentViewKey: null,
        split: {
          vertical: 0.4,
          horizontal: 0.5,
        },
      };
    },
    methods: {
      emitResize() {
        const resizeEvt = new Event('resize');
        window.dispatchEvent(resizeEvt);
      },
      onViewChange() {
        setTimeout(() => this.emitResize(), 10);
      },
    },
    mounted() {
      this.currentViewKey = this.spatialViewerAvailable ? 'allHorizontal' : 'temporal';

      setTimeout(() => this.emitResize(), 10);
    },
    computed: {
      sim() {
        return this.$store.state.model.simulations.find((sim) => sim.id === this.simId);
      },
      geometry() {
        return this.$store.state.model.geometry;
      },
      spatialViewerAvailable() {
        return (
          this.sim.solver === SimSolver.STEPS &&
          get(this.sim, 'solverConf.spatialSampling.enabled') &&
          !!this.geometry
        );
      },
    },
  };
</script>

<style lang="scss" scoped>
  .ctrl {
    position: fixed;
    z-index: 10;
    left: 240px;
    top: 12px;
  }
</style>
