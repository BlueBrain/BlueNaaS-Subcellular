<template>
  <Drawer
    title="User profile"
    v-model="userProfileVisible"
    :styles="userProfileDrawerStyle"
    width="400"
    @input="onUserProfileVisibilityChange"
  >
    <i-form :label-width="70">
      <FormItem label="Full name">
        <i-input v-model="tmpUser.fullName" />
      </FormItem>
      <FormItem label="Email">
        <i-input v-model="tmpUser.email" />
      </FormItem>
      <FormItem label="User id">
        <i-input v-model="user.id" readonly />
      </FormItem>
    </i-form>

    <div class="userprofile-drawer-footer">
      <i-button class="mr-12" @click="hideUserProfile"> Cancel </i-button>
      <i-button type="primary" :disabled="!saveBtnActive" @click="onSaveUserProfileBtnClick"> Ok </i-button>
    </div>
  </Drawer>
</template>

<script>
import pick from 'lodash/pick'

import isEqualBy from '@/tools/is-equal-by'

const userProfileDrawerStyle = {
  height: 'calc(100% - 28px)',
  overflow: 'auto',
  paddingBottom: '28px',
  position: 'static',
  color: 'red',
}

export default {
  name: 'user-profile-drawer',
  props: ['value'],
  data() {
    return {
      userProfileDrawerStyle,
      tmpUser: {
        fullName: null,
        email: null,
      },
      userProfileVisible: false,
    }
  },
  methods: {
    onSaveUserProfileBtnClick() {
      this.$store.dispatch('setUser', { ...this.user, ...this.tmpUser })
      this.hideUserProfile()
    },
    hideUserProfile() {
      this.userProfileVisible = false
      this.onUserProfileVisibilityChange()
    },
    onUserProfileVisibilityChange() {
      this.$emit('input', false)
    },
  },
  computed: {
    user() {
      return this.$store.state.user
    },
    saveBtnActive() {
      return !isEqualBy(this.user, this.tmpUser, ['fullName', 'email'])
    },
  },
  watch: {
    value() {
      this.userProfileVisible = this.value
      this.tmpUser = pick(this.user, ['fullName', 'email'])
    },
  },
}
</script>

<style lang="scss" scoped>
.userprofile-drawer-footer {
  width: 100%;
  position: absolute;
  bottom: 0;
  left: 0;
  border-top: 1px solid #e8e8e8;
  padding: 10px 16px;
  text-align: right;
  background: #fff;
}
</style>
