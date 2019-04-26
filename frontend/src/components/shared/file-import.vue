
<template>
  <Upload
    type="drag"
    action="/dummy-endpoint"
    :format="fileExtensions"
    :before-upload="beforeUpload"
  >
    <div class="container">
      <Icon
        type="ios-cloud-upload"
        size="52"
        style="color: #3399ff"
      />
      <p>Click or drag files here to upload</p>
      <p>Supported formats: {{ supportedFormatsStr }}</p>

      <p v-if="descriptionText">
        {{ descriptionText }}
      </p>

      <p
        v-if="errorMsg"
        class="error"
      >
        {{ errorMsg }}
      </p>
    </div>
  </Upload>
</template>


<script>
  export default {
    name: 'file-import',
    props: ['fileExtensions', 'errorMsg', 'descriptionText'],
    methods: {
      beforeUpload(file) {
        const reader = new FileReader();
        reader.onload = e => this.onFileRead(file.name, e.target.result);
        reader.readAsText(file);

        // prevent default action to upload data to remote api
        return false;
      },
      onFileRead(name, content) {
        this.$emit('on-file-read', { name, content });
      },
    },
    computed: {
      supportedFormatsStr() {
        // ['rnf', 'tsv'] => '.rnf, .tsv'
        return this.fileExtensions
          .map(e => `.${e}, `)
          .join('')
          .slice(0, -2);
      },
    },
  };
</script>


<style lang="scss" scoped>
  .container {
    padding: 20px;
  }
</style>
