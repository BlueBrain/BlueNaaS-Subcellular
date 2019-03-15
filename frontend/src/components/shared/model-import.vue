
<template>
  <Upload
    type="drag"
    action="/dummy-endpoint"
    :format="['bngl']"
    :before-upload="beforeUpload"
  >
    <div class="container">
      <Icon type="ios-cloud-upload" size="52" style="color: #3399ff"></Icon>
      <p>Click or drag files here to upload</p>
      <p>Supported formats: .bngl</p>
    </div>
  </Upload>
</template>


<script>
  export default {
    name: 'model-import',
    methods: {
      beforeUpload(file) {
        this.modelName = file.name.split('.').slice(0, -1).join('.');
        const reader = new FileReader();
        reader.onload = e => this.onFileRead(e.target.result);
        reader.readAsText(file);

        // prevent default action to upload data to remote api
        return false;
      },
      showImportErrorModal() {
        this.$Notice.error({
          title: 'Import error',
          desc: 'There was an error while parsing BNGL model file. ',
        });
      },
      onFileRead(fileContent) {
        this.$store.dispatch('importModel', { modelName: this.modelName, fileContent })
          .then(() => this.$emit('import-finish'))
          .catch(() => this.showImportErrorModal());
      },
    },
  };
</script>


<style lang="scss" scoped>
  .container {
    padding: 20px;
  }
</style>
