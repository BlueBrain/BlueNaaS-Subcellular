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

    <Row :gutter="12" type="flex">
      <i-col class="mt-12" :xs="{ span: 24, order: 2 }" :xl="{ span: 16, order: 1 }">
        <i-button type="warning" @click="onRemoveSelectedClick"> Remove selected </i-button>
        <component class="inline-block" :is="toolByEntityType[entityType]" />
      </i-col>
      <i-col class="mt-12" :xs="{ span: 24, order: 1 }" :xl="{ span: 8, order: 2 }">
        <i-input v-model="filterStr" clearable placeholder="Filter" />
      </i-col>
    </Row>
  </div>
</template>

<script>
import get from 'lodash/get'

import constants from '@/constants'
import contentConfig from '../../revision-editor/revision-content/content-config'
import objStrSearchFilter from '@/tools/obj-str-search-filter'

import SpeciesTools from './search-entities/tools/species-tools'

const { entityTypeCollectionMap, EntityType } = constants

const toolByEntityType = {
  [EntityType.SPECIES]: SpeciesTools,
}

const searchExcludedProps = ['entityId', 'id', '_id', 'entityType', 'userId']

export default {
  name: 'search-entities',
  props: ['entityType'],
  data() {
    return {
      toolByEntityType,
      tableColumns: [],
      selection: [],
      filterStr: '',
    }
  },
  mounted() {
    this.initTableColumnConfig()
  },
  methods: {
    onSelectionChange(selection) {
      this.selection = selection
    },
    onRemoveSelectedClick() {
      this.$store.commit('removeQueryResultEntities', {
        type: this.entityType,
        entities: this.selection,
      })
    },
    rowClassName(row, index) {
      return row.style ? `demo-table-${row.style}-${index % 2 ? 'odd' : 'even'}-row` : ''
    },
    initTableColumnConfig() {
      this.tableColumns = contentConfig.build(contentConfig.Type.VIEWER, this.entityType, this.queryConfig)
    },
  },
  computed: {
    loading() {
      return this.$store.state.revision.loading
    },
    entities() {
      return this.$store.state.repoQueryResult[entityTypeCollectionMap[this.entityType]].filter((e) =>
        objStrSearchFilter(this.filterStr, e, { exclude: searchExcludedProps })
      )
    },
    queryConfig() {
      return this.$store.state.repoQueryConfig
    },
  },
  watch: {
    queryConfig: {
      handler() {
        this.initTableColumnConfig()
      },
      deep: true,
    },
  },
}
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
