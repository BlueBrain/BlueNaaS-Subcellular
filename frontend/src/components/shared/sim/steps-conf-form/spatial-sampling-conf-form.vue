<template>
  <div class="p-12">
    <span>Enable:</span>
    <i-switch class="ml-12" size="small" v-model="conf.enabled" @on-change="onChange" />

    <p class="mt-6">Structures</p>
    <i-table
      class="small-table"
      highlight-row
      no-data-text="Add model structures to use the feature"
      :columns="structureColumns"
      :data="structures"
      @on-selection-change="onStructureSelectionChange"
    />

    <p class="mt-6">Observables</p>
    <i-table
      class="small-table"
      highlight-row
      no-data-text="Add model observables to use the feature"
      :columns="observableColumns"
      :data="observables"
      @on-selection-change="onObservableSelectionChange"
    />
  </div>
</template>

<script>
  import cloneDeep from 'lodash/cloneDeep';

  import constants from '@/constants';
  import BnglText from '@/components/shared/bngl-text';

  const { SimSolver, defaultSolverConfig } = constants;
  const { spatialSampling } = defaultSolverConfig[SimSolver.STEPS];

  const observableColumns = [
    {
      type: 'selection',
      width: 60,
      align: 'center',
    },
    {
      title: 'Name',
      key: 'name',
      maxWidth: 200,
    },
    {
      title: 'BioNetGen definition',
      render: (h, params) =>
        h(BnglText, {
          props: {
            entityType: 'observable',
            value: params.row.definition,
          },
        }),
    },
  ];

  const structureColumns = [
    {
      type: 'selection',
      width: 60,
      align: 'center',
    },
    {
      title: 'Name',
      key: 'name',
      maxWidth: 200,
    },
    {
      title: 'Type',
      key: 'type',
    },
  ];

  export default {
    name: 'spatial-sampling-conf',
    components: {
      'bngl-text': BnglText, //eslint-disable-line
    },
    props: ['value'],
    data() {
      return {
        observableColumns,
        structureColumns,
        // add default value for spatialSampling because
        // sim config saved in older versions of the app
        // doesn't have this property
        conf: Object.assign(cloneDeep(spatialSampling), this.value || {}),
      };
    },
    methods: {
      onStructureSelectionChange(structures) {
        this.conf.structures = structures;
        this.onChange();
      },
      onObservableSelectionChange(observables) {
        this.conf.observables = observables;
        this.onChange();
      },
      onChange() {
        this.$emit('input', { ...this.conf });
      },
    },
    computed: {
      structures() {
        return this.$store.state.model.structures.map((st) => ({
          ...st,
          _checked: !!this.conf.structures.find((s) => s.name === st.name),
        }));
      },
      observables() {
        return this.$store.state.model.observables.map((ob) => ({
          ...ob,
          _checked: !!this.conf.observables.find((o) => o.name === ob.name),
        }));
      },
    },
    watch: {
      value() {
        this.conf = Object.assign(cloneDeep(spatialSampling), this.value || {});
      },
    },
  };
</script>

<style lang="scss" scoped>
  .small-table {
    line-height: 24px;
  }
</style>
