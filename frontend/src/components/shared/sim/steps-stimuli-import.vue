
<template>
  <file-import
    :file-formats="importFileFormats"
    :errorMsg="errorMsg"
    @on-file-read="onFileRead"
  />
</template>


<script>
  import modelTools from '@/tools/model-tools';
  import FileImport from '@/components/shared/file-import.vue';

  const importFileFormats = [{ type: 'TSV', extension: 'tsv' }];

  export default {
    name: 'steps-stimuli-import',
    components: {
      'file-import': FileImport,
    },
    data() {
      return {
        importFileFormats,
        errorMsg: '',
        descriptionText: '',
      };
    },
    methods: {
      onFileRead({ name, content }) {
        const type = name.split('.').slice(-1)[0];
        const stimuli = modelTools.parseStimuli(type, content);
        this.$emit('on-import', stimuli);
      },
    },
  };
</script>
