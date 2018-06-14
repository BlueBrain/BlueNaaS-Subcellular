
<template>
  <main>
    <canvas ref="canvas"></canvas>
    <circuit-loading-modal/>
  </main>
</template>


<script>
  import store from '@/store';
  import NeuronRenderer from '@/services/neuron-renderer';

  import CircuitLoadingModal from './modals/circuit-loading.vue';

  export default {
    name: 'main-view',
    components: {
      'circuit-loading-modal': CircuitLoadingModal,
    },
    mounted() {
      const { canvas } = this.$refs;
      this.renderer = new NeuronRenderer(canvas, {
        onHover: () => {},
        onHoverEnd: () => {},
        onClick: () => {},
      });

      store.$on('circuitLoaded', () => this.initRenderer());
      store.$on('redrawCircuit', () => this.redrawNeurons());

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
            return positionBufferAttr.setXYZ(neuronIndex, 10000, 10000, 10000);
          }

          const neuronPosition = store.$get('neuronPosition', neuronIndex);
          const glColor = palette[neuron[neuronPropIndex[neuronProp]]];

          positionBufferAttr.setXYZ(neuronIndex, ...neuronPosition);
          colorBufferAttr.setXYZ(neuronIndex, ...glColor);
        });

        this.renderer.updateNeuronCloud();
      },
    },
  };
</script>


<style lang="scss" scoped>
  #canvas {
    height: 100%;
    width: 100%;
  }
</style>
