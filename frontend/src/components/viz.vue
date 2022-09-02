<template>
  <div class="p-12 h-100 o-scroll-y">
    <h2>Visualizations</h2>
    <Tabs v-if="$store.state.model.id">
      <TabPane label="Contact Map" name="contact">
        <contact-map />
      </TabPane>
      <TabPane label="Reactivity network" name="reactivity">
        <reactivity-network />
      </TabPane>
    </Tabs>
    <v-else>Load a model to show the visualizations</v-else>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import ModelMenu from './model-page/menu.vue'
import DbView from './model-page/db.vue'
import ContactMap from './contact-map.vue'
import ReactivityNetwork from './reactivity-network.vue'

export default Vue.extend({
  name: 'viz',
  data() {
    return {
      split: {
        vertical: 0.2,
        leftHorizontal: 0.5,
        rightHorizontal: 0.5,
      },
    }
  },
  components: {
    'model-menu': ModelMenu,
    'db-view': DbView,
    'contact-map': ContactMap,
    'reactivity-network': ReactivityNetwork,
  },
})
</script>

<style lang="scss" scoped>
.width-82 {
  width: 82px;
}
</style>
