
<template>
  <file-import
    :file-extensions="['tsv']"
    :errorMsg="errorMsg"
    @on-file-read="onFileRead"
  />
</template>


<script>
  import modelTools from '@/tools/model-tools';
  import FileImport from '@/components/shared/file-import.vue';

  export default {
    name: 'steps-stimuli-import',
    components: {
      'file-import': FileImport,
    },
    data() {
      return {
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
