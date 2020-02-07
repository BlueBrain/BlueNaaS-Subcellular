
<template>
  <div class="h-100 position-relative o-scroll-y">
    <div class="block-head">
      <h3>Subcellular models repository</h3>
    </div>

    <div class="block-main p-12">
      <i-input
        placeholder="model search"
        search
      />
      <Tree
        :data="dbData"
        @on-select-change="onSelectChange"
      />
    </div>

    <div class="block-footer">
      <i-button
        class="mb-12"
        type="primary"
        long
        to="/molecular-repo"
      >
        Open molecular repository
      </i-button>
    </div>
  </div>
</template>


<script>
  import get from 'lodash/get';
  import publicModels from '@/data/public-models';

  export default {
    name: 'db-component',
    data() {
      return {
        dbData: [{
          title: 'My models',
          expand: true,
          children: [],
        }, {
          title: 'Public models',
          expand: false,
          children: publicModels
            .map(model => ({ title: model.name, type: 'model', model })),
        }],
      };
    },
    methods: {
      onSelectChange(nodeArray) {
        if (get(nodeArray, '[0].type') !== 'model') return;

        const selection = {
          type: 'dbModel',
          entity: nodeArray[0].model,
        };
        this.$store.commit('setEntitySelection', selection);
      },
    },
    computed: {
      modelNames() {
        return Object.keys(this.$store.state.dbModels);
      },
      dbModels() {
        return this.$store.state.dbModels;
      },
    },
    watch: {
      modelNames(modelNames) {
        this.dbData[0].children = modelNames
          .map(n => ({ title: n, type: 'model', model: this.dbModels[n] }));
      },
    },
  };
</script>


<style lang="scss" scoped>
  .block-db-footer {
    position: absolute;
    height: 84px;
    left: 0;
    bottom: 0;
    width: 100%;
    padding: 12px;
  }
</style>
