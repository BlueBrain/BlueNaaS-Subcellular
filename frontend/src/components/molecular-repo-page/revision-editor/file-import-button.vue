
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
      <file-import
        :file-formats="importFileFormats"
        :loading="loading"
        :errorMsg="errorMsg"
        @on-file-read="onFileRead"
      >
        <div class="text-left">
          <small>* Experimental feature</small>
        </div>
      </file-import>
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
        loading: false,
        importModalVisible: false,
        errorMsg: null,
      };
    },
    methods: {
      showImportModal() {
        this.importModalVisible = true;
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

        this.$store.dispatch('importRevisionFile', { name, fileContent: content, type: this.type })
          .then(() => this.onImportSuccess())
          .catch(err => this.onImportError(err))
          .finally(() => this.disableLoadingState());
      },
    },
  };
</script>
