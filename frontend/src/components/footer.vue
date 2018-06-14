
<template>
  <footer>
    <soma-color-ctrl class="soma-color-ctrl"/>
  </footer>
</template>


<script>
  import SomaColorCtrl from './footer/soma-color-ctrl.vue';

  export default {
    name: 'footer-component',
    components: {
      'soma-color-ctrl': SomaColorCtrl,
    },
  };
</script>


<style lang="scss" scoped>
  .soma-color-ctrl {
    position: absolute;
    top: 6px;
    right: 12px;
    width: 200px;
  }
</style>
