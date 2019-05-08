
<template>
  <div>
    <Card>
      <Row :gutter="12">
        <i-col :span="12">
          <h4>Cell info</h4>
          <neuron-info-table class="mt-12" :neuron="neuron"/>
        </i-col>
        <i-col :span="12">
          <h4>Synapse info</h4>
          <synapse-info-table class="mt-12" :synapse="synapse"/>
        </i-col>
      </Row>
    </Card>

    <Card class="mt-12">
      <protein-selector v-model="proteins"/>
    </Card>

    <div class="text-right mt-12">
      <i-button
        type="primary"
        :disabled="!proteins.length"
        @click="gotoNextStep"
      >
        To molecule concentrations
        <Icon type="arrow-right-a"></Icon>
      </i-button>
    </div>
  </div>
</template>


<script>
  import store from '@/store';

  import ProteinSelector from './protein-selector.vue';
  import NeuronInfoTable from '@/components/shared/neuron-info-table.vue';
  import SynapseInfoTable from '@/components/shared/synapse-info-table.vue';

  export default {
    name: 'protein-tab',
    data() {
      return {
        neuron: null,
        synapse: null,
        proteins: [],
      };
    },
    components: {
      'protein-selector': ProteinSelector,
      'neuron-info-table': NeuronInfoTable,
      'synapse-info-table': SynapseInfoTable,
    },
    mounted() {
      store.$on('setProteinSelectionState', () => {
        this.synapse = store.state.synapse;
        this.neuron = store.state.neuron;
      });
    },
    methods: {
      gotoNextStep() {
        store.$dispatch('proteinsSelected', this.proteins);
      },
    },
  };
</script>
