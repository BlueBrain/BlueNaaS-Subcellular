
<template>
  <footer>

    <div
      class="circuit"
      v-if="state === 'cellSelection'"
    >
      <soma-color-palette/>
      <soma-color-ctrl class="soma-color-ctrl"/>
      <div class="soma-size-ctrl">
        <soma-size-ctrl/>
      </div>
    </div>
    <div class="hover-object-info">
      <hover-object-info/>
    </div>
  </footer>
</template>


<script>
  import SomaColorCtrl from './footer/soma-color-ctrl.vue';
  import HoverObjectInfo from './footer/hover-object-info.vue';
  import SomaColorPalette from './footer/soma-color-palette.vue';

  export default {
    name: 'footer-component',
    components: {
      'soma-color-ctrl': SomaColorCtrl,
      'soma-size-ctrl': SomaSizeCtrl,
      'hover-object-info': HoverObjectInfo,
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

  .circuit, .footer-morphology {
    width: 50%;
    position: relative;
  }

  .soma-color-ctrl, {
    position: absolute;
    top: 6px;
    right: 12px;
    width: 200px;
  }

  .soma-size-ctrl, .synapse-size-ctrl {
    position: absolute;
    right: 12px;
    top: -224px;
  }

  .hover-object-info {
    position: absolute;
    top: -224px;
    left: 12px;
  }
</style>
