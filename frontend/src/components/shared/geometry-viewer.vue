
<template>
  <div class="h-100 pos-relative canvas-container">

    <div class="compartment-agenda-container">
      <div
        class="mb-6"
        v-for="comp in compartments"
        :key="comp.name"
      >
        <i-switch
          class="mr-6"
          v-model="comp.visible"
          size="small"
          :style="comp.visible ? {'background-color': comp.color} : {}"
          @on-change="onVisibilityChange(comp)"
        />
        <span>{{ comp.name }}</span>
      </div>
    </div>

    <div class="display-conf-container">
      <i-switch
        class="mr-6"
        size="small"
        v-model="displayMode"
        :true-value="GeometryDisplayMode.WIREFRAME"
        :false-value="GeometryDisplayMode.DEFAULT"
        @on-change="onDisplayModeChange"
      />
      <span>Wireframe</span>
    </div>

    <canvas ref="canvas"></canvas>

  </div>
</template>


<script>
  import ModelGeometryRenderer from '@/services/model-geometry-renderer';
  import constants from '@/constants';

  const { StructureType, GeometryDisplayMode } = constants;


  export default {
    name: 'geometry-viewer',
    props: {
      geometryData: {
        type: Object,
      },
    },
    data() {
      return {
        GeometryDisplayMode,
        compartments: [],
        displayMode: GeometryDisplayMode.DEFAULT,
      };
    },
    mounted() {
      this.renderer = new ModelGeometryRenderer(this.$refs.canvas);
      this.initGeometry();
    },
    methods: {
      initGeometry() {
        this.renderer.initGeometry(this.geometryData, this.displayMode);
        this.compartments = (this.geometryData.structures || [])
          .filter(st => st.type === StructureType.COMPARTMENT)
          .map((st, idx) => ({
            name: st.name,
            color: this.renderer.colors[idx].css(),
            visible: true,
          }));
      },
      onVisibilityChange(comp) {
        this.renderer.setVisible(comp.name, comp.visible);
      },
      onDisplayModeChange(mode) {
        this.renderer.setDisplayMode(mode);
      },
    },
    watch: {
      geometryData() {
        this.renderer.clearGeometry();
        this.initGeometry();
      },
    },
    beforeDestroy() {
      this.renderer.destroy();
    },
  };
</script>


<style lang="scss" scoped>
  .compartment-agenda-container, .display-conf-container {
    background-color: #f8f8f9;
    border: 1px solid #e9ebef;
    position: absolute;
    z-index: 10;
    bottom: 6px;
    padding: 6px;
  }

  .compartment-agenda-container {
    padding-bottom: 2px;
    left: 6px;

    span {
      vertical-align: middle;
    }
  }

  .display-conf-container {
    right: 6px;
  }

  .color-block {
    display: inline-block;
    height: 14px;
    width: 14px;
    border: 1px solid #808080;
    vertical-align: middle;
  }

  .canvas-container {
    overflow: hidden;
  }

  canvas {
    position: absolute;
  }
</style>
