<template>
  <div class="h-100">
    <header-component />
    <main>
      <Split class="split-container p-12" v-model="split.vertical" min="200px" :max="0.4">
        <div slot="left">
          <Split v-model="split.leftHorizontal" mode="vertical">
            <div slot="top">
              <model-menu />
            </div>
            <div slot="bottom" class="pt-6">
              <db-view />
            </div>
          </Split>
        </div>

        <div slot="right">
          <router-view />
        </div>
      </Split>
    </main>
  </div>
</template>

<script>
import './styles.scss'
import './server-events'
import Header from './components/header.vue'
import ModelMenu from './components/model-page/menu.vue'
import DbView from './components/model-page/db.vue'

export default {
  name: 'app',
  components: {
    'header-component': Header,
    'model-menu': ModelMenu,
    'db-view': DbView,
  },
  data() {
    return {
      split: {
        vertical: 0.2,
        leftHorizontal: 0.5,
        rightHorizontal: 0.5,
      },
    }
  },
  async mounted() {
    await this.$store.dispatch('init')

    const { publicModel } = this.$route.query
    if (publicModel) {
      this.$router.replace({ query: {} })
      await this.$store.dispatch('loadPublicModelByName', publicModel)
    }
  },
}
</script>

<style lang="scss" scoped>
.ivu-split-pane > div {
  height: 100%;
}
</style>
