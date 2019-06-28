
<template>
  <div>
    <i-table
      :data="entities"
      :columns="tableColumns"
      :row-class-name="rowClassName"
      stripe
      border
      height="320"
      :loading="loading"
      no-data-text="No data"
      @on-selection-change="onSelectionChange"
    >
    </i-table>

    <Row class="mt-12" :gutter="12">
      <i-col span="12">
        <i-button
          type="warning"
          @click="onRemoveSelectedClick"
        >
          Remove selected
        </i-button>
      </i-col>
      <i-col span="12">
        <i-input
          v-model="filterStr"
          clearable
          placeholder="Filter"
        />
      </i-col>
    </Row>
  </div>
</template>


<script>
  import constants from '@/constants';
  import contentConfig from '../../revision-editor/revision-content/content-config';
  import objStrSearchFilter from '@/tools/obj-str-search-filter';

  const { entityTypeCollectionMap } = constants;

  export default {
    name: 'search-entities',
    props: ['entityType'],
    data() {
      return {
        tableColumns: contentConfig.revisionSearchColumnConfig[this.entityType],
        selection: [],
        filterStr: '',
      };
    },
    methods: {
      onSelectionChange(selection) {
        this.selection = selection;
      },
      onRemoveSelectedClick() {
        this.$store.commit('removeQueryResultEntities', {
          type: this.entityType,
          entities: this.selection,
        });
      },
      rowClassName(row, index) {
        return row.style ? `demo-table-${row.style}-${index % 2 ? 'odd' : 'even'}-row` : '';
      },
    },
    computed: {
      loading() {
        return this.$store.state.revision.loading;
      },
      entities() {
        return this.$store.state.repoQueryResult[entityTypeCollectionMap[this.entityType]]
          .filter(e => objStrSearchFilter(this.filterStr, e));
      },
    },
  };
</script>


<style lang="scss">
  .ivu-table {
    .demo-table-info-odd-row td {
      // background-color: #2db7f5 !important;
      background-color: #d3f0fd !important;
    }

    .demo-table-info-even-row td {
      background-color: #e7f7fe !important;
    }

    .demo-table-error-row td {
      background-color: #ff6600 !important;
    }
  }
</style>
