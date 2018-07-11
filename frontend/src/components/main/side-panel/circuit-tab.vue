<template>
  <div>
    <div v-if="neuron">
      <neuron-info-table :neuron="neuron"/>
      <div class="text-right mt-12">
        <i-button
          type="primary"
          size="small"
          @click="gotoNextStep"
        >
          To synapse selection
          <Icon type="arrow-right-a"></Icon>
        </i-button>
      </div>
    </div>
  </div>
</template>


<script>
  import store from '@/store';

  import NeuronInfoTable from './../../shared/neuron-info-table.vue';

  export default {
    name: 'circuit-tab',
    data() {
      return {
        neuron: null,
      };
    },
    components: {
      'neuron-info-table': NeuronInfoTable,
    },
    mounted() {
      store.$on('setNeuron', (neuron) => {
        this.neuron = neuron;
      });
    },
    methods: {
      gotoNextStep() {
        store.$dispatch('neuronSelected', this.neuron);
      },
    },
  };
</script>

