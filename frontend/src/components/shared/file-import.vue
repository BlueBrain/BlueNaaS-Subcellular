<template>
  <Upload
    type="drag"
    action="/dummy-endpoint"
    :disabled="loading || disabled"
    :format="supportedExtensions"
    :before-upload="beforeUpload"
  >
    <div class="container">
      <Icon class="upload-icon" type="ios-cloud-upload" size="52" />
      <p>Click or drag files here to upload</p>
      <p>Supported formats: {{ supportedTypeStr }}</p>

      <p v-if="descriptionText">
        {{ descriptionText }}
      </p>

      <p v-if="errorMsg" class="error">
        {{ errorMsg }}
      </p>

      <br />

      <slot />

      <Spin v-if="loading" size="large" fix />
    </div>
  </Upload>
</template>

<script>
  import get from 'lodash/get';

  const defaultMode = 'text';

  export default {
    name: 'file-import',
    props: ['fileFormats', 'errorMsg', 'descriptionText', 'loading', 'disabled'],
    methods: {
      beforeUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => this.onFileRead(file.name, e.target.result);

        const ext = file.name.split('.').pop().toLowerCase();

        const fileFormat = this.fileFormats.find((format) => format.extension === ext);

        const mode = get(fileFormat, 'mode', defaultMode);

        switch (mode) {
          case 'text':
            reader.readAsText(file);
            break;
          case 'binary':
            reader.readAsArrayBuffer(file);
            break;
          default:
            throw new Error(`Unknown file read mode ${mode} for file ${file.name}`);
        }

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
          .map((f) => `${f.type}, `)
          .join('')
          .slice(0, -2);
      },
      supportedExtensions() {
        return this.fileFormats.map((f) => f.extension);
      },
    },
  };
</script>

<style lang="scss" scoped>
  .container {
    padding: 12px;
    padding-top: 20px;

    .upload-icon {
      color: #3399ff;
    }
  }
</style>
