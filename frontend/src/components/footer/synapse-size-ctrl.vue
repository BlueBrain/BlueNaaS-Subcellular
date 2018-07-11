
<template>
  <div class="synapse-size-ctrl-container">
    <vue-slider
      :direction="'vertical'"
      :height="200"
      :width="3"
      :dot-size="12"
      :real-time="true"
      :min="1"
      :max="5"
      :value="size"
      tooltip="hover"
      @callback="setSynapseSize"
    ></vue-slider>
  </div>
</template>


<script>
  import VueSlider from 'vue-slider-component';

  import store from '@/store';

  export default {
    data() {
      return { size: store.state.circuit.synapseSize };
    },
    components: {
      'vue-slider': VueSlider,
    },
    methods: {
      setSynapseSize(size) {
        store.$dispatch('setSynapseSize', size);
      },
    },
  };
</script>


<style lang="scss" scoped>
  .synapse-size-ctrl-container {
    padding: 6px;
    background-color: white;
    border: 1px solid #dddee1;
    border-radius: 4px;

    &:hover {
      box-shadow: 0 1px 6px rgba(202, 69, 69, 0.2);
    }
  }
</style>
