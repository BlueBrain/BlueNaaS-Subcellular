<template>
  <div class="h-100">
    <header-component />
    <main>
      <router-view></router-view>
    </main>
  </div>
</template>

<script>
import './styles.scss'
import './server-events'

import bus from './services/event-bus'

import Header from './components/header.vue'

export default {
  name: 'app',
  components: {
    'header-component': Header,
  },
  async mounted() {
    window.addEventListener('resize', () => bus.$emit('layoutChange'))
    await this.$store.dispatch('init')

    const { publicModel } = this.$route.query
    if (publicModel) {
      this.$router.replace({ query: {} })
      await this.$store.dispatch('loadPublicModelByName', publicModel)
    }
  },
}
</script>
