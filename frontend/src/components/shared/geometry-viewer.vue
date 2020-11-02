<template>
  <div class="h-100 w-100 pos-relative" ref="container">
    <div class="compartment-agenda-container" v-if="structure.compartments.length || structure.membranes.length">
      <div class="comp-type-agenda" v-for="(label, stType) in structureTypeLabel" :key="stType">
        <div v-if="structure[stType].length">
          <p class="mb-6">{{ label }}:</p>
          <div class="mb-4" v-for="st in structure[stType]" :key="st.name">
            <i-switch
              class="mr-6 switch--extra-small"
              v-model="st.visible"
              size="small"
              :style="st.visible ? { 'background-color': st.color } : {}"
              @on-change="onVisibilityChange(st)"
            />
            <span>{{ st.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="display-conf-container">
      <i-switch
        class="mr-6 switch--extra-small"
        size="small"
        v-model="displayWireframeMode"
        @on-change="onDisplayModeChange"
      />
      <span>Wireframe</span>
    </div>

    <div class="fullscreen-ctrl-container">
      <i-button type="text" @click="toggleFullscreen">
        <Icon type="ios-expand" size="18" />
      </i-button>
    </div>

    <canvas ref="canvas"></canvas>
  </div>
</template>

<script>
import toggleFullscreen from 'toggle-fullscreen'

import ModelGeometryRenderer from '@/services/model-geometry-renderer'
import constants from '@/constants'
import bus from '@/services/event-bus'

const { StructureType } = constants

const displayConf = {
  default: {
    meshSurfaceOpacity: 1,
    meshWireframeOpacity: 0,
  },
  wireframe: {
    meshSurfaceOpacity: 0.1,
    meshWireframeOpacity: 0.5,
  },
}

export default {
  name: 'geometry-viewer',
  props: {
    geometryData: {
      type: Object,
    },
  },
  data() {
    return {
      structure: {
        compartments: [],
        membranes: [],
      },
      structureTypeLabel: {
        compartments: 'Compartments',
        membranes: 'Membranes',
      },
      displayWireframeMode: false,
    }
  },
  mounted() {
    this.renderer = new ModelGeometryRenderer(this.$refs.canvas)

    this.onLayoutChangeBinded = this.onLayoutChange.bind(this)
    bus.$on('layoutChange', this.onLayoutChangeBinded)

    setTimeout(() => this.initGeometry(), 10)
  },
  beforeDestroy() {
    bus.$off('layoutChange', this.onLayoutChangeBinded)
    this.renderer.destroy()
  },
  methods: {
    initGeometry() {
      this.renderer.initGeometry(this.geometryData, displayConf.default)
      const structure = (this.geometryData.meta.structures || []).map((st, idx) => ({
        name: st.name,
        color: this.renderer.colors[idx].css(),
        visible: true,
        type: st.type,
      }))

      this.structure.compartments = structure.filter((st) => st.type === StructureType.COMPARTMENT)
      this.structure.membranes = structure.filter((st) => st.type === StructureType.MEMBRANE)
    },
    onLayoutChange() {
      this.renderer.onResize()
    },
    onVisibilityChange(comp) {
      this.renderer.setVisible(comp.name, comp.visible)
    },
    onDisplayModeChange(wireframe) {
      this.renderer.setDisplayConf(displayConf[wireframe ? 'wireframe' : 'default'])
    },
    async toggleFullscreen() {
      await toggleFullscreen(this.$refs.container)
      // TODO: investigate more, refactor
      // workaround for Safari where size of the container
      // is not updated immediately after entering full screen mode
      setTimeout(() => this.renderer.onResize(), 500)
    },
  },
  watch: {
    geometryData() {
      this.renderer.clearGeometry()
      this.initGeometry()
    },
  },
}
</script>

<style lang="scss" scoped>
.compartment-agenda-container,
.display-conf-container,
.fullscreen-ctrl-container {
  background-color: #f8f8f9;
  border: 1px solid #e9ebef;
  position: absolute;
  z-index: 2;
  padding: 6px;
  max-height: calc(100% - 12px);
  overflow-y: scroll;
}

.comp-type-agenda {
  padding: 6px 0;
}

.compartment-agenda-container {
  padding-bottom: 2px;
  left: 6px;
  bottom: 6px;

  span {
    vertical-align: middle;
  }
}

.display-conf-container {
  right: 6px;
  bottom: 6px;
}

.fullscreen-ctrl-container {
  right: 6px;
  top: 6px;
}

.color-block {
  display: inline-block;
  height: 14px;
  width: 14px;
  border: 1px solid #808080;
  vertical-align: middle;
}

canvas {
  position: absolute;
  height: 100% !important;
  width: 100% !important;
}
</style>
