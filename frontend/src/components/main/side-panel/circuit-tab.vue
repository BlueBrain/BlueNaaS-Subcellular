<template>
  <div>
    <neuron-prop-filter/>
    <div v-if="neuron">
      <neuron-info-table :neuron="neuron"/>
      <div class="text-right mt-12">
        <i-button
          type="primary"
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

  import NeuronPropFilter from './neuron-prop-filter.vue';
  import NeuronInfoTable from '@/components/shared/neuron-info-table.vue';

  export default {
    name: 'circuit-tab',
    data() {
      return {
        neuron: null,
      };
    },
    components: {
      'neuron-prop-filter': NeuronPropFilter,
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

