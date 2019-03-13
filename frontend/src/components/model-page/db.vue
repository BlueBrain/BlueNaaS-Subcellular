
<template>
  <div class="h-100 position-relative o-scroll-y">
    <div class="block-head">
      <h3>Model DB</h3>
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
      <Tooltip
        class="w-100"
        :transfer="true"
        max-width="280"
      >
        <i-button
          type="primary"
          long
          @click="openModelBuilderPage"
        >
          Model builder
        </i-button>
        <div slot="content">
          <p>Create a model based on available circuit data.</p>
          <p>Includes proteins, ions, metabolites, their concentrations and reactions defined per each compartment.</p>
        </div>
      </Tooltip>
    </div>
  </div>
</template>


<script>
  import get from 'lodash/get';
  import publicModels from '@/data/public-models';

  export default {
    name: 'db-component',
    mounted() {
      this.$store.dispatch('loadDbModels');
    },
    data() {
      return {
        dbData: [{
          title: 'Biological models',
          expand: true,
          children: [{
            title: 'My',
            expand: false,
            children: [],
          }, {
            title: 'Shared',
            expand: false,
          }, {
            title: 'Public',
            expand: false,
            children: publicModels.map(model => ({ title: model.name, type: 'model', model })),
          }],
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
      openModelBuilderPage() {
        this.$router.push('/model-builder');
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
        this.dbData[0].children[0].children = modelNames.map(n => ({ title: n, type: 'model', model: this.dbModels[n] }));
      },
    },
  };
</script>
