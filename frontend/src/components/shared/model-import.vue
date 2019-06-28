
<template>
  <Upload
    type="drag"
    action="/dummy-endpoint"
    :format="['bngl', 'xml']"
    :disabled="loading"
    :before-upload="beforeUpload"
  >
    <div class="container">
      <Icon type="ios-cloud-upload" size="52" style="color: #3399ff"></Icon>
      <p>Click or drag files here to upload</p>
      <p>Supported formats: BNGL, SBML*</p>
      <br>
      <div class="text-left">
        <small>* Experimental feature</small>
      </div>
      <Spin
        v-if="loading"
        size="large"
        fix
      />
    </div>
  </Upload>
</template>


<script>
  const typeByExt = {
    bngl: 'bngl',
    xml: 'sbml',
  };

  export default {
    name: 'model-import',
    data() {
      return { loading: false };
    },
    methods: {
      beforeUpload(file) {
        this.loading = true;
        this.modelName = file.name
          .split('.')
          .slice(0, -1)
          .join('.');

        const fileExtNorm = file.name
          .split('.')
          .slice(-1)[0]
          .toLowerCase();

        this.type = typeByExt[fileExtNorm];
        const reader = new FileReader();
        reader.onload = e => this.onFileRead(e.target.result);
        reader.readAsText(file);

        // prevent default action to upload data to remote api
        return false;
      },
      disableLoadingState() {
        this.loading = false;
      },
      onImportSuccess() {
        this.$Notice.success({
          title: 'Import success',
          desc: `${this.type.toUpperCase()} model has been imported successfully`,
        });
        this.$emit('import-finish');
      },
      onImportError(err) {
        this.$Notice.error({
          title: 'Import error',
          desc: err.message,
        });
      },
      onFileRead(fileContent) {
        const importModelPayload = {
          fileContent,
          modelName: this.modelName,
          type: this.type,
        };
        this.$store.dispatch('importModel', importModelPayload)
          .then(() => this.onImportSuccess())
          .catch(err => this.onImportError(err))
          .finally(() => this.disableLoadingState());
      },
    },
  };
</script>


<style lang="scss" scoped>
  .container {
    padding: 12px;
    padding-top: 20px;
  }
</style>
