
<template>
  <header>
    <div class="title">
      <span>Subcellular app. </span>
      <span v-if="modelName"> Model: {{ modelName }}</span>
    </div>
    <div
      class="user-profile"
      @click="showUserProfile"
    >
      {{ user.fullName || 'Unknown user' }}
      <Icon
        class="user-icon"
        type="md-person"
      />
    </div>

    <user-profile-drawer v-model="userProfileVisible"/>
  </header>
</template>


<script>
  import UserProfileDrawer from '@/components/shared/user-profile-drawer.vue';

  export default {
    name: 'header-component',
    components: {
      'user-profile-drawer': UserProfileDrawer,
    },
    data() {
      return {
        userProfileVisible: false,
      };
    },
    methods: {
      showUserProfile() {
        this.userProfileVisible = true;
      },
    },
    computed: {
      modelName() {
        return this.$store.state.model.name;
      },
      user() {
        return this.$store.state.user;
      },
    },
  };
</script>


<style lang="scss" scoped>
  .title {
    display: inline-block;
  }
  .user-profile {
    float: right;
    cursor: pointer;
  }
  .user-icon {
    line-height: 28px;
  }
</style>
