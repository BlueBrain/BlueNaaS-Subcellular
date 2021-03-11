<template>
  <div class="p-12 h-100 o-scroll-y">
    <h2>Visualizations</h2>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';

  import socket from '@/services/websocket';

  export default Vue.extend({
    name: 'viz',
    data() {
      return {
        importModalVisible: false,
        saveInProgress: false,
        saveBtnLabel: 'Save',
      };
    },
    async created() {
      if (this.model.id !== null) {
        await socket.request('visualize', this.model);
      }
    },
    methods: {
      clearModel() {
        this.$store.dispatch('clearModel');
      },
      saveModel() {
        this.saveInProgress = true;
        this.saveBtnLabel = 'Saving';
        this.$store.dispatch('saveModel');
        setTimeout(() => {
          this.saveBtnLabel = 'Saved!';
        }, 300);
        setTimeout(() => {
          this.saveBtnLabel = 'Save';
          this.saveInProgress = false;
        }, 1200);
      },
      async exportModel(format) {
        try {
          await this.$store.dispatch('exportModel', format);
        } catch (err) {
          this.$Notice.error({
            title: 'Export error',
            desc: err.message,
          });
        }
      },
      showImportModal() {
        this.importModalVisible = true;
      },
      onImportFinished() {
        this.importModalVisible = false;
      },
    },
    computed: {
      model() {
        return this.$store.state.model;
      },
      name: {
        get() {
          return this.$store.state.model.name;
        },
        set(name) {
          this.$store.commit('updateModelName', name);
        },
      },
      annotation: {
        get() {
          return this.$store.state.model.annotation;
        },
        set(annotation) {
          this.$store.commit('updateModelAnnotation', annotation);
        },
      },
      saveBtnAvailable() {
        return !!this.name;
      },
    },
  });
</script>

<style lang="scss" scoped>
  .width-82 {
    width: 82px;
  }
</style>
