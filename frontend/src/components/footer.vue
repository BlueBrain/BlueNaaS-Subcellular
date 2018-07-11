
<template>
  <footer>

    <div
      class="circuit"
      v-if="state === 'cellSelection'"
    >
      <soma-color-palette/>
      <soma-color-ctrl class="soma-color-ctrl"/>
    </div>
  </footer>
</template>


<script>
  import SomaColorCtrl from './footer/soma-color-ctrl.vue';
  import SomaColorPalette from './footer/soma-color-palette.vue';

  export default {
    name: 'footer-component',
    components: {
      'soma-color-ctrl': SomaColorCtrl,
      'soma-color-palette': SomaColorPalette,
    },
    data() {
      return {
        state: 'cellSelection',
      };
    },
  };
</script>


<style lang="scss" scoped>
  footer {
    position: relative;
  }
  .soma-color-ctrl, {
    position: absolute;
    top: 6px;
    right: 12px;
    width: 200px;
  }
</style>
