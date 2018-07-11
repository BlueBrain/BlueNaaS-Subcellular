
<template>
  <main>
    <div class="canvas-container">
      <canvas ref="canvas"></canvas>
      <circuit-loading-modal/>
    </div>

    <div class="side-panel" :class="{'full-width': !viewerVisible}">
      <side-panel/>
    </div>
  </main>
</template>


<script>
  import store from '@/store';
  import NeuronRenderer from '@/services/neuron-renderer';

  import CircuitLoadingModal from './modals/circuit-loading.vue';
  import SidePanel from './main/side-panel.vue';

  export default {
    name: 'main-view',
    components: {
      'circuit-loading-modal': CircuitLoadingModal,
      'side-panel': SidePanel,
    },
    data() {
      return {
        viewerVisible: true,
      };
    },
    mounted() {
      const { canvas } = this.$refs;
      this.renderer = new NeuronRenderer(canvas, {
        onHover: this.onHover.bind(this),
        onHoverEnd: this.onHoverEnd.bind(this),
        onClick: this.onClick.bind(this),
      });

      store.$on('circuitLoaded', () => this.initRenderer());
      store.$on('redrawCircuit', () => this.redrawNeurons());

      store.$on('showCellMorphology', () => this.renderer.showMorphology());

      store.$on('hideCircuit', () => this.renderer.hideNeuronCloud());

      store.$on('initSynapseCloud', () => {
        this.renderer.initSynapseCloud();
        this.renderer.updateSynapses();
      });
      store.$on('updateSynapses', () => this.renderer.updateSynapses());

      store.$on('setSomaSize', size => this.renderer.setNeuronCloudPointSize(size));
      store.$on('hideViewer', () => {
        this.viewerVisible = false;
        this.renderer.stopRenderLoop();
      });

      store.$on('showViewer', () => this.renderer.animate());

      store.$dispatch('loadCircuit');
    },
    methods: {
      initRenderer() {
        const neuronSetSize = store.state.circuit.neurons.length;
        this.renderer.initNeuronCloud(neuronSetSize);
        this.redrawNeurons();
        this.renderer.alignCamera();
      },
      redrawNeurons() {
        const {
          globalFilterIndex,
          neurons,
          neuronPropIndex,
          color: {
            palette,
            neuronProp,
          },
        } = store.state.circuit;

        const { positionBufferAttr, colorBufferAttr } = this.renderer.neuronCloud;

        neurons.forEach((neuron, neuronIndex) => {
          if (!globalFilterIndex[neuronIndex]) {
            // TODO: find a better way to hide part of the cloud
            positionBufferAttr.setXYZ(neuronIndex, 10000, 10000, 10000);
            return;
          }

          const neuronPosition = store.$get('neuronPosition', neuronIndex);
          const glColor = palette[neuron[neuronPropIndex[neuronProp]]];

          positionBufferAttr.setXYZ(neuronIndex, ...neuronPosition);
          colorBufferAttr.setXYZ(neuronIndex, ...glColor);
        });

        this.renderer.updateNeuronCloud();
      },

      onHover(obj) {
        switch (obj.type) {
        case 'cloudNeuron': {
          const neuron = store.$get('neuron', obj.neuronIndex);
          store.$dispatch('neuronHovered', neuron);
          break;
        }
        case 'synapse': {
          store.$dispatch('synapseHovered', obj.synapseIndex);
          break;
        }
        default: {
          break;
        }
        }
      },
      onHoverEnd(obj) {
        switch (obj.type) {
        case 'cloudNeuron': {
          const neuron = store.$get('neuron', obj.neuronIndex);
          store.$dispatch('neuronHoverEnded', neuron);
          break;
        }
        case 'synapse': {
          store.$dispatch('synapseHoverEnded', obj.synapseIndex);
          break;
        }
        default: {
          break;
        }
        }
      },
      onClick(obj) {
        switch (obj.type) {
        case 'neuronCloud': {
          const neuron = store.$get('neuron', obj.index);
          store.$dispatch('neuronClicked', neuron);
          break;
        }
        default: {
          break;
        }
        }
      },
    },
  };
</script>


<style lang="scss" scoped>
  .canvas-container {
    overflow: hidden;
    flex: 1 0;
  }

  .side-panel {
    flex: 0 0 50%;
    overflow-x: hidden;
    border-left: 1px solid #dddee1;
    transition: flex-basis 0.3s ease-in-out;

    &.full-width {
      flex-basis: 100%;
    }
  }

  .hover-object-info {
    position: absolute;
    bottom: -60px;
  }
</style>
