
<template>
  <div>
    <h4>Synapse property filter</h4>

    <synapse-prop-filter class="mt-12"/>

    <div v-if="synapse">
      <synapse-info-table :synapse="synapse"/>
      <div class="text-right mt-12">
        <i-button
          type="primary"
          size="small"
          @click="gotoNextStep"
        >
          To protein selection
          <Icon type="arrow-right-a"></Icon>
        </i-button>
      </div>
    </div>
  </div>
</template>


<script>
  import store from '@/store';

  import SynapsePropFilter from './synapse-prop-filter.vue';
  import SynapseInfoTable from './../../shared/synapse-info-table.vue';

  export default {
    name: 'synapse-tab',
    components: {
      'synapse-prop-filter': SynapsePropFilter,
      'synapse-info-table': SynapseInfoTable,
    },
    data() {
      return {
        synapse: null,
      };
    },
    mounted() {
      store.$on('setSynapse', (synapse) => {
        this.synapse = synapse;
      });
    },
    methods: {
      gotoNextStep() {
        store.$dispatch('synapseSelected', this.synapse);
      },
    },
  };
</script>

