
<template>
  <Modal
    class-name="vertical-center-modal circuit-loading-modal"
    v-model="visible"
    :closable="false"
    :mask-closable="false"
  >
    <div slot="header">
      <h3>Loading circuit data</h3>
    </div>
    <div slot="footer">
      <p class="description">
        Loading cell positions and their properties. For big circuits it might take a while.
      </p>
      <i-progress :percent="progress" />
    </div>
  </Modal>
</template>


<script>
  import store from '@/store';

  export default {
    name: 'circuit-loading-modal',
    data() {
      return {
        progress: 0,
        visible: false,
      };
    },
    mounted() {
      store.$on('setCircuitLoadingProgress', (progress) => { this.progress = progress; });
      store.$on('showCircuitLoadingModal', () => { this.visible = true; });
      store.$on('hideCircuitLoadingModal', () => { this.visible = false; });
    },
  };
</script>


<style lang="scss">
  .vertical-center-modal{
    display: flex;
    align-items: center;
    justify-content: center;

    .ivu-modal{
      top: 0;
    }
  }

  .circuit-loading-modal {
    .ivu-modal-body {
      display: none;
    }

    .ivu-modal-footer {
      text-align: left;
    }

    .description {
      color: #555555;
      margin-bottom: 12px;
    }
  }
</style>
