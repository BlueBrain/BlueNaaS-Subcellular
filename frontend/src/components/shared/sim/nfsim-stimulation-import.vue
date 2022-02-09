<template>
  <file-import
    :file-formats="importFileFormats"
    :errorMsg="errorMsg"
    :loading="loading"
    @on-file-read="onFileRead"
  />
</template>

<script>
import modelTools from '@/tools/model-tools';
import FileImport from '@/components/shared/file-import.vue';

const importFileFormats = [
  { type: 'RNF', extension: 'rnf' },
  { type: 'TSV', extension: 'tsv' },
];

export default {
  name: 'nfsim-stimulation-import',
  components: {
    'file-import': FileImport,
  },
  data() {
    return {
      importFileFormats,
      errorMsg: '',
      descriptionText: '',
      loading: false,
    };
  },
  methods: {
    async onFileRead({ name, content }) {
      this.loading = true;
      const type = name.split('.').slice(-1)[0];
      const stimulation = await modelTools.parseStimulation(type, content);
      this.$emit('on-import', stimulation);
      this.loading = false;
    },
  },
};
</script>
