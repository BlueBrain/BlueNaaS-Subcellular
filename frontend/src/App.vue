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

<script lang="ts">
import './styles.scss'
import './server-events'
import Header from './components/header.vue'
import ModelMenu from './components/model-page/menu.vue'
import DbView from './components/model-page/db.vue'
import * as api from '@/services/api'

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
  async created() {
    await this.$store.dispatch('init')

    const { modelId } = this.$route.query

    if (modelId) {
      this.$router.replace({ query: {} })
      const modelRes = await api.get(`models/${modelId}`)
      if (modelRes) await this.$store.commit('loadDbModel', modelRes.data)
    }
  },
}
</script>

<style lang="scss" scoped>
.ivu-split-pane > div {
  height: 100%;
}
</style>
