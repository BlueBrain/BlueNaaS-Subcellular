
<template>
  <Upload
    type="drag"
    action="/dummy-endpoint"
    :disabled="loading"
    :format="supportedExtensions"
    :before-upload="beforeUpload"
  >
    <div class="container">
      <Icon
        type="ios-cloud-upload"
        size="52"
        style="color: #3399ff"
      />
      <p>Click or drag files here to upload</p>
      <p>Supported formats: {{ supportedTypeStr }}</p>

      <p v-if="descriptionText">
        {{ descriptionText }}
      </p>

      <p
        v-if="errorMsg"
        class="error"
      >
        {{ errorMsg }}
      </p>

      <br>

      <slot/>

      <Spin
        v-if="loading"
        size="large"
        fix
      />
    </div>
  </Upload>
</template>


<script>
  export default {
    name: 'file-import',
    props: ['fileFormats', 'errorMsg', 'descriptionText', 'loading'],
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
      supportedTypeStr() {
        // ['rnf', 'tsv'] => '.rnf, .tsv'
        return this.fileFormats
          .map(f => `${f.type}, `)
          .join('')
          .slice(0, -2);
      },
      supportedExtensions() {
        return this.fileFormats.map(f => f.extension);
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
