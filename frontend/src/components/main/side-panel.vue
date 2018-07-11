
<template>
  <div class="side-panel-container">
    <Steps
      class="steps-container"
      size="small"
      :current="currentStep"
    >
      <Step title="Cell selection"></Step>
    </Steps>

    <Tabs v-model="currentStep" class="tabs-header--hidden">
      <TabPane label="">
        <circuit-tab/>
      </TabPane>
    </Tabs>
  </div>
</template>


<script>
  import store from '@/store';

  import CircuitTab from './side-panel/circuit-tab.vue';

  export default {
    name: 'side-panel',
    components: {
      'circuit-tab': CircuitTab,
    },
    data() {
      return {
        currentStep: 0,
      };
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
