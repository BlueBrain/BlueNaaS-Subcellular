
<template>
  <div class="h-100 pos-relative canvas-container">

    <div class="compartment-agenda-container">
      <div
        class="mb-6"
        v-for="comp in compartments"
        :key="comp.name"
      >
        <div class="color-block mr-6" :style="{'background-color': comp.color}"></div>
        <span>{{ comp.name }}</span>
      </div>
    </div>

    <canvas ref="canvas"></canvas>

  </div>
</template>


<script>
  import ModelGeometryRenderer from '@/services/model-geometry-renderer';
  import constants from '@/constants';


  export default {
    name: 'geometry-viewer',
    props: {
      geometryData: {
        type: Object,
      },
    },
    data() {
      return {
        compartments: [],
      };
    },
    mounted() {
      this.renderer = new ModelGeometryRenderer(this.$refs.canvas);
      this.initGeometry();
    },
    methods: {
      initGeometry() {
        this.renderer.initGeometry(this.geometryData);
        this.compartments = (this.geometryData.structures || [])
          .filter(st => st.type === constants.StructureType.COMPARTMENT)
          .map((st, idx) => ({ name: st.name, color: this.renderer.colors[idx].css() }));
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
  .compartment-agenda-container {
    position: absolute;
    z-index: 10;
    bottom: 6px;
    left: 6px;
    line-height: 14px;

    span {
      vertical-align: middle;
    }
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
