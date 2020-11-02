<template>
  <div class="p-12 h-100 o-scroll-y">
    <h2>Subcellular model: {{ name || 'unnamed' }}</h2>

    <i-form class="mt-12" :label-width="100" @submit.native.prevent="saveModel">
      <FormItem label="Name *">
        <i-input ref="nameInput" size="small" v-model="name" />
      </FormItem>
      <FormItem label="Annotation">
        <i-input size="small" type="textarea" :rows="8" v-model="annotation" />
      </FormItem>
      <FormItem>
        <i-button class="width-82" type="warning" disabled @click="clearModel">
          Clear model
        </i-button>
        <i-button
          type="primary"
          class="ml-12 width-82"
          :loading="saveInProgress"
          :disabled="!saveBtnAvailable"
          @click="saveModel"
        >
          {{ saveBtnLabel }}
        </i-button>
        <i-button class="ml-12 width-82" type="default" @click="showImportModal"> Import </i-button>
        <Dropdown trigger="click" :transfer="true" @on-click="exportModel">
          <i-button type="primary" class="ml-12 width-82">
            Export
            <Icon type="ios-arrow-down"></Icon>
          </i-button>
          <DropdownMenu slot="list">
            <DropdownItem name="bngl">BNGL</DropdownItem>
            <DropdownItem name="ebngl">eBNGL</DropdownItem>
            <DropdownItem name="pysb_flat">PySB</DropdownItem>
            <DropdownItem name="sbml" disabled>SBML</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </FormItem>
    </i-form>

    <Modal
      title="Model import"
      v-model="importModalVisible"
      class-name="vertical-center-modal"
      :footer-hide="true"
    >
      <model-import @import-finish="onImportFinished" />
    </Modal>
  </div>
</template>

<script>
  import ModelImport from '@/components/shared/model-import.vue';

  export default {
    name: 'model-meta',
    components: {
      'model-import': ModelImport,
    },
    data() {
      return {
        importModalVisible: false,
        saveInProgress: false,
        saveBtnLabel: 'Save',
      };
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
      exportModel(format) {
        this.$store.dispatch('exportModel', format);
      },
      showImportModal() {
        this.importModalVisible = true;
      },
      onImportFinished() {
        this.importModalVisible = false;
      },
    },
    computed: {
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
  };
</script>

<style lang="scss" scoped>
  .width-82 {
    width: 82px;
  }
</style>
