
<template>
  <div class="h-100 w-100 pos-relative" ref="container">

    <div
      class="agenda-container"
    >
      <h3 class="mb-6">Structures</h3>
      <div
        class="comp-type-agenda"
        v-for="(label, stType) in structureTypeLabel"
        :key="stType"
      >
        <div v-if="structure[stType].length">
          <p class="mb-6">{{ label }}:</p>
          <div
            class="mb-4"
            v-for="st in structure[stType]"
            :key="st.name"
          >
            <i-switch
              class="mr-6 switch--extra-small"
              v-model="st.visible"
              size="small"
              :style="st.visible ? {'background-color': st.color} : {}"
              @on-change="onStructureVisibilityChange(st)"
            />
            <span>{{ st.name }}</span>
          </div>
        </div>
      </div>

      <h3 class="mb-6 mt-12">Molecules</h3>
      <div
        class="mb-4"
        v-for="molecule in molecules"
        :key="molecule.name"
      >
        <i-switch
          class="mr-6 switch--extra-small"
          v-model="molecule.visible"
          size="small"
          :style="molecule.visible ? {'background-color': molecule.color} : {}"
          @on-change="onMoleculeVisibilityChange(molecule)"
        />
        <span>{{ molecule.name }}</span>
      </div>
    </div>

    <div class="display-conf-container">
      <i-form :label-width="120">
        <FormItem label="Surface opacity">
          <Slider
            v-model="displayConf.meshSurfaceOpacity"
            :min="0"
            :max="1"
            :step="0.01"
            @on-input="onDisplayConfChange"
          />
        </FormItem>
        <FormItem label="Wireframe opacity">
          <Slider
            v-model="displayConf.meshWireframeOpacity"
            :min="0"
            :max="1"
            :step="0.01"
            @on-input="onDisplayConfChange"
          />
        </FormItem>
        <Divider/>
        <FormItem label="Molecule size">
          <Slider
            v-model="displayConf.moleculeSize"
            :min="0.01"
            :max="0.3"
            :step="0.01"
            @on-input="onDisplayConfChange"
          />
        </FormItem>
      </i-form>
    </div>

    <canvas ref="canvas"/>

  </div>
</template>


<script>
  import ModelGeometryRenderer from '@/services/model-geometry-renderer';
  import constants from '@/constants';
  import bus from '@/services/event-bus';

  const { StructureType } = constants;


  export default {
    name: 'spatial-result-viewer',
    props: ['simId'],
    data() {
      return {
        displayConf: {
          meshSurfaceOpacity: 0.25,
          meshWireframeOpacity: 0.5,
          moleculeSize: 0.15,
        },
        structure: {
          compartments: [],
          membranes: [],
        },
        molecules: [],
        structureTypeLabel: {
          compartments: 'Compartments',
          membranes: 'Membranes',
        },
      };
    },
    mounted() {
      this.renderer = new ModelGeometryRenderer(this.$refs.canvas);

      this.onLayoutChangeBinded = this.onLayoutChange.bind(this);
      this.onSpatialStepTraceBinded = this.onSpatialStepTrace.bind(this);
      bus.$on('layoutChange', this.onLayoutChangeBinded);
      bus.$on('ws:simSpatialStepTrace', this.onSpatialStepTraceBinded);

      setTimeout(() => this.initGeometry(), 10);
    },
    beforeDestroy() {
      bus.$off('layoutChange', this.onLayoutChangeBinded);
      bus.$off('ws:simSpatialStepTrace', this.onSpatialStepTraceBinded);
      this.renderer.destroy();
    },
    methods: {
      initGeometry() {
        this.renderer.initGeometry(this.geometry, this.displayConf);
        const structure = (this.geometry.meta.structures || [])
          .map((st, idx) => ({
            name: st.name,
            color: this.renderer.colors[idx].css(),
            visible: true,
            type: st.type,
          }));

        this.structure.compartments = structure.filter(st => st.type === StructureType.COMPARTMENT);
        this.structure.membranes = structure.filter(st => st.type === StructureType.MEMBRANE);

        const moleculeNames = this.sim.solverConf.spatialSampling.observables.map(o => o.name);
        this.renderer.initMolecules(moleculeNames);

        this.molecules = Object.entries(this.renderer.moleculeConfig)
          .map(([name, mol]) => ({ name, color: mol.color.css(), visible: true }));
      },
      onLayoutChange() {
        this.renderer.onResize();
      },
      onSpatialStepTrace(spatialStepTrace) {
        this.renderMolecules(spatialStepTrace.data);
      },
      onStructureVisibilityChange(comp) {
        this.renderer.setVisible(comp.name, comp.visible);
        this.renderMolecules();
      },
      onDisplayConfChange() {
        this.renderer.setDisplayConf(this.displayConf);
      },
      onMoleculeVisibilityChange(molecule) {
        this.renderer.setMoleculeConfig(molecule.name, { visible: molecule.visible });
        this.renderMolecules();
      },
      renderMolecules(spatialStepTrace) {
        if (spatialStepTrace) {
          this.currentSpatialStepTrace = spatialStepTrace;
          this.renderer.renderMolecules(spatialStepTrace);
          return;
        }

        if (this.currentSpatialStepTrace) {
          this.renderer.renderMolecules(this.currentSpatialStepTrace);
        }
      },
    },
    computed: {
      geometry() {
        return this.$store.state.model.geometry;
      },
      sim() {
        return this.$store.state.model.simulations
          .find(sim => sim.id === this.simId);
      },
    },
  };
</script>


<style lang="scss" scoped>
  .structure-agenda-container, .display-conf-container, .agenda-container {
    background-color: #ffffff;
    border: 1px solid #cacbcf;
    border-radius: 3px;
    position: absolute;
    z-index: 2;
    padding: 6px;
    max-height: calc(100% - 12px);
    // overflow-y: scroll;
  }

  .comp-type-agenda {
    padding: 6px 0;
  }

  .structure-agenda-container {
    padding-bottom: 2px;
    left: 12px;
    bottom: 12px;

    span {
      vertical-align: middle;
    }
  }

  .display-conf-container {
    padding: 6px;
    padding-right: 12px;
    right: 12px;
    bottom: 12px;
    width: 400px;

    .ivu-form-item {
      margin-bottom: 0;
    }

    .ivu-divider {
      margin: 6px 0;
    }
  }

  .agenda-container {
    top: 12px;
    left: 12px;
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
