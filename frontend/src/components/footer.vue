
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

    <div
      class="footer-morphology"
      v-if="state === 'synapseSelection'"
    >
      <div class="synapse-size-ctrl">
        <synapse-size-ctrl/>
      </div>
      <synapse-color-palette/>
    </div>

    <div class="hover-object-info">
      <hover-object-info/>
    </div>
  </footer>
</template>


<script>
  import store from '@/store';

  import SomaColorCtrl from './footer/soma-color-ctrl.vue';
  import SomaSizeCtrl from './footer/soma-size-ctrl.vue';
  import SynapseSizeCtrl from './footer/synapse-size-ctrl.vue';
  import HoverObjectInfo from './footer/hover-object-info.vue';
  import SomaColorPalette from './footer/soma-color-palette.vue';
  import SynapseColorPalette from './footer/synapse-color-palette.vue';

  export default {
    name: 'footer-component',
    components: {
      'soma-color-ctrl': SomaColorCtrl,
      'soma-size-ctrl': SomaSizeCtrl,
      'synapse-size-ctrl': SynapseSizeCtrl,
      'hover-object-info': HoverObjectInfo,
      'soma-color-palette': SomaColorPalette,
      'synapse-color-palette': SynapseColorPalette,
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
