
<template>
  <div>
    <i-button
      type="primary"
      long
      @click="showImportModal"
    >
      Import from a file
    </i-button>

    <Modal
      v-model="importModalVisible"
      title="Import revision data from a file"
      class-name="vertical-center-modal"
    >
      <div v-if="concSources.length > 1">
        <p>Select target concentration to import</p>
        <i-select
          class="mt-12"
          v-model="concSource"
        >
          <i-option
            v-for="concSource in concSources"
            :key="concSource"
            :value="concSource"
          >
            {{ concSource }}
          </i-option>
        </i-select>
      </div>

      <file-import
        class="mt-12"
        :file-formats="importFileFormats"
        :loading="loading"
        :disabled="!concSource"
        :errorMsg="errorMsg"
        @on-file-read="onFileRead"
      >
        <div class="text-left">
          <small>* Experimental feature</small>
        </div>
      </file-import>

      <div slot="footer">
        <i-button
          type="primary"
          @click="hideImportModal"
        >
          OK
        </i-button>
      </div>
    </Modal>
  </div>
</template>


<script>
  import FileImport from '@/components/shared/file-import.vue';

  const typeByExt = {
    bngl: 'bngl',
    xml: 'sbml',
    json: 'ebngl',
  };

  const importFileFormats = [
    { type: 'BNGL', extension: 'bngl' },
    { type: 'eBNGL', extension: 'json' },
    { type: 'SBML*', extension: 'xml' },
  ];

  export default {
    name: 'file-import-button',
    components: {
      'file-import': FileImport,
    },
    data() {
      return {
        importFileFormats,
        concSource: null,
        loading: false,
        importModalVisible: false,
        errorMsg: null,
      };
    },
    mounted() {
      this.init();
    },
    methods: {
      init() {
        this.concSource = this.concSources.length === 1
          ? this.concSources[0]
          : null;
      },
      showImportModal() {
        this.importModalVisible = true;
      },
      hideImportModal() {
        this.importModalVisible = false;
      },
      onImportSuccess() {
        this.importModalVisible = false;
        this.$Notice.success({
          title: 'Imported successfully',
        });
      },
      onImportError(err) {
        this.$Notice.error({
          title: 'Import error',
          desc: err.message,
        });
      },
      disableLoadingState() {
        this.loading = false;
      },
      onFileRead({ name, content }) {
        // TODO: add revision preview
        this.loading = true;
        const fileExtNorm = name
          .split('.')
          .slice(-1)[0]
          .toLowerCase();

        this.type = typeByExt[fileExtNorm];

        const importRevFileParams = {
          name,
          fileContent: content,
          type: this.type,
          targetConcSource: this.concSource,
        };

        this.$store.dispatch('importRevisionFile', importRevFileParams)
          .then(() => this.onImportSuccess())
          .catch(err => this.onImportError(err))
          .finally(() => this.disableLoadingState());
      },
    },
    computed: {
      concSources() {
        return this.$store.state.revision.config.concSources;
      },
    },
    watch: {
      concSources() {
        this.init();
      },
    },
  };
</script>
