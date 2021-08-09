<template>
  <Split
    class="split-container p-12"
    v-model="split.vertical"
    min="200px"
    :max="0.4"
    @input="onLayoutChange"
  >
    <div slot="left">
      <div slot="top">
        <model-menu />
      </div>
      <div slot="bottom" class="pt-6">
        <db-view />
      </div>
    </div>

    <div slot="right">
      <div class="p-12 h-100 o-scroll-y">
        <h2>Visualizations</h2>
        <Tabs>
          <TabPane label="Contact Map" name="contact">
            <contact-map />
          </TabPane>
          <TabPane label="Reactivity network" name="reactivity">
            <reactivity-network />
          </TabPane>
        </Tabs>
      </div>
    </div>
  </Split>
</template>

<script lang="ts">
  import Vue from 'vue';

  import bus from '@/services/event-bus';
  import ModelMenu from './model-page/menu.vue';
  import DbView from './model-page/db.vue';
  import ContactMap from './contact-map.vue';
  import ReactivityNetwork from './reactivity-network.vue';

  export default Vue.extend({
    name: 'viz',
    data() {
      return {
        split: {
          vertical: 0.2,
          leftHorizontal: 0.5,
          rightHorizontal: 0.5,
        },
      };
    },
    components: {
      'model-menu': ModelMenu,
      'db-view': DbView,
      'contact-map': ContactMap,
      'reactivity-network': ReactivityNetwork,
    },

    methods: {
      onLayoutChange() {
        bus.$emit('layoutChange');
      },
    },
  });
</script>

<style lang="scss" scoped>
  .width-82 {
    width: 82px;
  }
</style>
