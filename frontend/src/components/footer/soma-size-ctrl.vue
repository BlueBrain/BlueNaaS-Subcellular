
<template>
  <div class="soma-size-ctrl-container">
    <vue-slider
      :direction="'vertical'"
      :height="200"
      :width="3"
      :dot-size="12"
      :real-time="true"
      :min="5"
      :max="30"
      :value="size"
      tooltip="hover"
      @callback="setSomaSize"
    ></vue-slider>
  </div>
</template>


<script>
  import VueSlider from 'vue-slider-component';

  import store from '@/store';

  export default {
    data() {
      return { size: store.state.circuit.somaSize };
    },
    components: {
      'vue-slider': VueSlider,
    },
    methods: {
      setSomaSize(size) {
        store.$dispatch('setSomaSize', size);
      },
    },
  };
</script>


<style lang="scss" scoped>
  .soma-size-ctrl-container {
    padding: 6px;
    background-color: white;
    border: 1px solid #dddee1;
    border-radius: 4px;

    &:hover {
      box-shadow: 0 1px 6px rgba(202, 69, 69, 0.2);
    }
  }
</style>
