<template>
  <div class="h-100 pos-relative">
    <div v-if="spatialViewerAvailable" class="ctrl">
      <i-select v-model="currentViewKey" @on-change="onViewChange">
        <i-option v-for="(viewLabel, viewKey) in view" :key="viewKey" :value="viewKey">{{ viewLabel }}</i-option>
      </i-select>
    </div>

    <temporal-result-viewer v-if="currentViewKey === 'temporal'" id="temporal-result-viewer" :sim-id="simId" />

    <spatial-result-viewer
      v-else-if="currentViewKey === 'spatial' && !!this.geometry"
      id="spatial-result-viewer"
      :sim-id="simId"
      :geometry="geometry"
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
        <spatial-result-viewer :sim-id="simId" id="spatial-result-viewer" :geometry="geometry" />
      </div>
    </Split>
  </div>
</template>

<script>
import get from 'lodash/get'
import { get as getr } from '@/services/api'

import TemporalResultViewer from './result-viewer/temporal-result-viewer.vue'
import SpatialResultViewer from './result-viewer/spatial-result-viewer.vue'

const view = {
  temporal: 'Temporal',
  spatial: 'Spatial',
  allHorizontal: 'Temporal + Spatial',
}

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
      geometry: null,
    }
  },
  async created() {
    await this.getGeometry()
  },
  methods: {
    emitResize() {
      const resizeEvt = new Event('resize')
      window.dispatchEvent(resizeEvt)
    },
    onViewChange() {
      setTimeout(() => this.emitResize(), 10)
    },
    async getGeometry() {
      const model = this.$store.state.model
      this.loading = true
      if (model.geometry_id)
        this.geometry = (
          await getr(`geometries/${model.geometry_id}`, {
            user_id: model.user_id,
          })
        ).data
      else {
        this.geometry = null
      }

      this.loading = false
    },
  },
  mounted() {
    this.currentViewKey = this.spatialViewerAvailable ? 'allHorizontal' : 'temporal'

    setTimeout(() => this.emitResize(), 10)
  },
  computed: {
    sim() {
      return this.$store.state.model.simulations.find((sim) => sim.id === this.simId)
    },

    spatialViewerAvailable() {
      return (
        (this.sim.solver === 'tetexact' || this.sim.solver == 'tetopsplit') &&
        get(this.sim, 'solverConf.spatialSampling.enabled') &&
        !!this.geometry
      )
    },
  },
}
</script>

<style lang="scss" scoped>
.ctrl {
  position: fixed;
  z-index: 10;
  left: 240px;
  top: 12px;
}
</style>
