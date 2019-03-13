
<template>
  <div class="p-12 h-100 o-scroll-y">
    <h2>Model: {{ name || 'unspecified' }}</h2>

    <i-form
      class="mt-12"
      :label-width="100"
      @submit.native.prevent="saveModel"
    >
      <FormItem
        label="Name"
      >
        <i-input
          ref="nameInput"
          size="small"
          v-model="name"
        />
      </FormItem>
      <FormItem label="Annotation">
        <i-input
          size="small"
          type="textarea"
          :rows="8"
          v-model="annotation"
        />
      </FormItem>
      <FormItem>
        <i-button
          type="warning"
          disabled
          @click="clearModel"
        >
          Clear model
        </i-button>
        <i-button
          type="primary"
          class="ml-12"
          @click="saveModel"
        >
          Save
        </i-button>
        <i-button
          class="ml-12"
          type="default"
          @click="showImportModal"
        >
          Import
        </i-button>
        <Dropdown
          trigger="click"
          :transfer="true"
          @on-click="exportModel"
        >
          <i-button
            type="primary"
            class="ml-12"
          >
            Export
            <Icon type="ios-arrow-down"></Icon>
          </i-button>
          <DropdownMenu slot="list">
            <DropdownItem name="bngl">BNGL</DropdownItem>
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
      <model-import
        @import-finish="onImportFinished"
      />
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
      };
    },
    methods: {
      clearModel() {
        this.$store.dispatch('clearModel');
      },
      saveModel() {
        this.$store.dispatch('saveModel');
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
        get() { return this.$store.state.model.name; },
        set(name) { this.$store.commit('updateModelName', name); },
      },
      annotation: {
        get() { return this.$store.state.model.annotation; },
        set(annotation) { this.$store.commit('updateModelAnnotation', annotation); },
      },
    },
  };
</script>
