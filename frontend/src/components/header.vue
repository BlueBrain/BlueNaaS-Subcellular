<template>
  <header>
    <div class="title">
      <span>BlueNaaS-Subcellular</span>
      <span v-if="modelName">| Model: {{ modelName }}</span>
    </div>

    <div class="menu-item ml-12" style="marginleft: 10px">
      <a href="https://subcellular-bsp-epfl.apps.hbp.eu/static/docs.html" target="_blank">
        <span style="color: white">Help and Documentation</span>
      </a>
    </div>

    <div class="menu-item" @click="showUserProfile">
      {{ user.fullName || 'Unknown user' }}
      <Icon type="md-person" size="16" />
    </div>

    <user-profile-drawer v-model="userProfileVisible" />

    <div class="menu-item" style="margin-right: 10px">
      <Icon type="ios-mail-outline" size="22" @click="showModal" />
    </div>

    <Modal v-model="modal" footer-hide="true">
      <div v-if="!emailMessage">
        Subscribe to the BlueNaaS-Subcellular mailing list to receive news and updates.
        <div style="margin-top: 10px">
          <Input v-model="email" type="email" placeholder="Enter your email address..." style="width: 300px" />
        </div>

        <div style="margin-top: 10px">
          <Button type="primary" @click="onSubscribe">Subscribe</Button>
        </div>
      </div>
      <div v-else>{{ this.emailMessage }}</div>
    </Modal>
  </header>
</template>

<script>
import UserProfileDrawer from '@/components/shared/user-profile-drawer.vue'
import { post } from '@/services/api'

export default {
  name: 'header-component',
  components: {
    'user-profile-drawer': UserProfileDrawer,
  },
  data() {
    return {
      userProfileVisible: false,
      modal: false,
      email: '',
      emailMessage: '',
    }
  },
  methods: {
    showUserProfile() {
      this.userProfileVisible = true
    },
    showModal() {
      this.modal = true
    },
    reset() {
      this.modal = false
      this.emailMessage = ''
    },
    hideModal() {
      this.modal = false
    },
    async onSubscribe() {
      const res = await post('subscribe', { user: this.user.id, email: this.email })
      if (res.status === 200 && res.data.status_code !== 400) {
        this.emailMessage = `Email sent to ${this.email} for verification`
        setTimeout(this.reset, 2000)
      } else if (res.data.status_code == 400) {
        this.emailMessage = 'User already subscribed to the newsletter'
        setTimeout(this.hideModal, 2000)
      }
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
