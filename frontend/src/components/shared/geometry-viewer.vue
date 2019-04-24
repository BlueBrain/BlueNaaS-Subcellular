
<template>
  <div class="h-100 pos-relative canvas-container">

    <div
      class="compartment-agenda-container"
      v-if="structure.compartments.length || structure.membranes.length"
    >
      <div
        class="comp-type-agenda"
        v-for="(label, stType) in structureTypeLabel"
        :key="stType"
      >
        <div v-if="structure[stType].length">
          <p class="mb-6">{{ label }}:</p>
          <div
            class="mb-6"
            v-for="st in structure[stType]"
            :key="st.name"
          >
            <i-switch
              class="mr-6"
              v-model="st.visible"
              size="small"
              :style="st.visible ? {'background-color': st.color} : {}"
              @on-change="onVisibilityChange(st)"
            />
            <span>{{ st.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="display-conf-container">
      <i-switch
        class="mr-6"
        size="small"
        v-model="displayMode"
        :false-value="GeometryDisplayMode.DEFAULT"
        :true-value="GeometryDisplayMode.WIREFRAME"
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
  import bus from '@/services/event-bus';

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
        structure: {
          compartments: [],
          membranes: [],
        },
        structureTypeLabel: {
          compartments: 'Compartments',
          membranes: 'Membranes',
        },
        displayMode: GeometryDisplayMode.DEFAULT,
      };
    },
    mounted() {
      this.renderer = new ModelGeometryRenderer(this.$refs.canvas);
      this.initGeometry();

      this.onLayoutChangeBinded = this.onLayoutChange.bind(this);
      bus.$on('layoutChange', this.onLayoutChangeBinded);
    },
    beforeDestroy() {
      bus.$off('layoutChange', this.onLayoutChangeBinded);
      this.renderer.destroy();
    },
    methods: {
      initGeometry() {
        this.renderer.initGeometry(this.geometryData, this.displayMode);
        const structure = (this.geometryData.structures || [])
          .map((st, idx) => ({
            name: st.name,
            color: this.renderer.colors[idx].css(),
            visible: true,
            type: st.type,
          }));

        this.structure.compartments = structure.filter(st => st.type === StructureType.COMPARTMENT);
        this.structure.membranes = structure.filter(st => st.type === StructureType.MEMBRANE);
      },
      onLayoutChange() {
        this.renderer.onResize();
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

  .comp-type-agenda {
    padding: 6px 0;
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
