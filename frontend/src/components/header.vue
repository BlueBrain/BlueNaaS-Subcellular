<template>
  <header>
    <div class="title">
      <span>Subcellular app</span>
      <span v-if="modelName">| Model: {{ modelName }}</span>
    </div>

    <div class="menu-item ml-12" style="marginleft: 10px">
      <a href="https://subcellular-bsp-epfl.apps.hbp.eu/docs/docs.html" target="_blank">
        <span style="color: white">Help and Documentation</span>
      </a>
    </div>

    <div class="menu-item" @click="showUserProfile">
      {{ user.fullName || 'Unknown user' }}
      <Icon type="md-person" size="16" />
    </div>

    <user-profile-drawer v-model="userProfileVisible" />
  </header>
</template>

<script>
import UserProfileDrawer from '@/components/shared/user-profile-drawer.vue'

export default {
  name: 'header-component',
  components: {
    'user-profile-drawer': UserProfileDrawer,
  },
  data() {
    return {
      userProfileVisible: false,
    }
  },
  methods: {
    showUserProfile() {
      this.userProfileVisible = true
    },
  },
  computed: {
    modelName() {
      return this.$store.state.model.name
    },
    user() {
      return this.$store.state.user
    },
  },
}
</script>

<style lang="scss" scoped>
.title {
  display: inline-block;
}
.menu-item {
  float: right;
  cursor: pointer;
}
</style>
