
<template>
  <Split
    class="split-container p-12"
    v-model="split.vertical"
    min="200px"
    :max="0.4"
    @input="onLayoutChange"
  >

    <div slot="left">
      <Split
        v-model="split.leftHorizontal"
        mode="vertical"
        min="250px"
        max="250px"
      >
        <div slot="top">
          <model-menu/>
        </div>
        <div slot="bottom" class="pt-6">
          <db-view/>
        </div>
      </Split>
    </div>

    <div slot="right">
      <Split
        v-model="split.rightHorizontal"
        mode="vertical"
        min="200px"
        max="160px"
        @input="onLayoutChange"
      >
        <div slot="top" class="pl-6">
          <primary-view/>
        </div>
        <div slot="bottom" class="pl-6 pt-6 o-auto">
          <secondary-view/>
        </div>
      </Split>
    </div>

  </Split>
</template>


<script>
  import bus from '@/services/event-bus';

  import ModelMenu from './model-page/menu.vue';
  import PrimaryView from './model-page/primary-view.vue';
  import DbView from './model-page/db.vue';
  import SecondaryView from './model-page/secondary-view.vue';

  export default {
    name: 'model-view',
    components: {
      'model-menu': ModelMenu,
      'primary-view': PrimaryView,
      'db-view': DbView,
      'secondary-view': SecondaryView,
    },
    data() {
      return {
        split: {
          vertical: '300px',
          leftHorizontal: 0.5,
          rightHorizontal: 0.5,
        },
      };
    },
    methods: {
      onLayoutChange() {
        bus.$emit('layoutChange');
      },
    },
  };
</script>


<style lang="scss" scoped>
  .ivu-split-pane > div {
    height: 100%;
  }
</style>
