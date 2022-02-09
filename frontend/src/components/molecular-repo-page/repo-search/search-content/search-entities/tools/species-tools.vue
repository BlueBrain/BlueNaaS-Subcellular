<template>
  <div v-if="globalConcSources.length > 1" class="inline-block ml-24">
    <span class="visible-conc-label inline-block mr-6"> Show conc: </span>
    <i-select
      class="conc-sources-select ml-6"
      v-model="visibleConcSources"
      placeholder="Select concentrations to show"
      multiple
      transfer
      @on-change="onVisibleConcSourcesChange"
    >
      <i-option v-for="source in sources" :key="source" :value="source">{{ source }}</i-option>
    </i-select>
  </div>
</template>

<script>
export default {
  name: 'species-tools',
  data() {
    return {
      visibleConcSources: [],
      sources: [],
    };
  },
  mounted() {
    this.init();
  },
  methods: {
    init() {
      this.sources = this.globalConcSources.slice();
      // by default show only first 5 concentrations
      this.visibleConcSources = this.sources.slice(0, 5);
    },
    onVisibleConcSourcesChange(sources) {
      setTimeout(() => this.$store.commit('setRevisionQueryVisibleConcSources', sources), 40);
    },
  },
  computed: {
    globalConcSources() {
      return this.$store.state.repoQueryConfig.concSources;
    },
  },
  watch: {
    globalConcSources() {
      this.init();
    },
  },
};
</script>

<style lang="scss" scoped>
.source-container {
  min-height: 160px;
}

.conc-sources-select {
  width: 420px;
}

.visible-conc-label {
  vertical-align: middle;
  font-size: 14px;
  line-height: 24px;
}
</style>
