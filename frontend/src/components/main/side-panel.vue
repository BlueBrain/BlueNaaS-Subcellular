
<template>
  <div class="side-panel-container">
    <Steps
      size="small"
      class="steps-container"
      :current="currentStep"
    >
      <Step title="Cell selection"></Step>
      <Step title="Synapse selection"></Step>
      <Step title="Molecule selection"></Step>
      <Step title="Molecule concentrations"></Step>
    </Steps>

    <Tabs v-model="currentStep" class="tabs-header--hidden">
      <TabPane label="">
        <circuit-tab/>
      </TabPane>
      <TabPane label="">
        <synapse-tab/>
      </TabPane>
      <TabPane label="">
        <protein-tab/>
      </TabPane>
      <TabPane label="">
        <protein-concentration-tab/>
      </TabPane>
    </Tabs>
  </div>
</template>


<script>
  import store from '@/store';

  import CircuitTab from './side-panel/circuit-tab.vue';
  import SynapseTab from './side-panel/synapse-tab.vue';
  import ProteinTab from './side-panel/protein-tab.vue';
  import ProteinConcentrationTab from './side-panel/protein-concentration-tab.vue';

  export default {
    name: 'side-panel',
    components: {
      'circuit-tab': CircuitTab,
      'synapse-tab': SynapseTab,
      'protein-tab': ProteinTab,
      'protein-concentration-tab': ProteinConcentrationTab,
    },
    data() {
      return {
        currentStep: 0,
      };
    },
    mounted() {
      store.$on('setSynapseSelectionState', () => { this.currentStep = 1; });
      store.$on('setProteinSelectionState', () => { this.currentStep = 2; });
      store.$on('setProteinConcentrationState', () => { this.currentStep = 3; });
    },
  };
</script>


<style lang="scss" scoped>
  .steps-container {
    margin: 12px 0 22px 22px;
  }

  .side-panel-container {
    padding: 16px;
  }
</style>
