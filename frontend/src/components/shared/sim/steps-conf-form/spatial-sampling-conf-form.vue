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

<script lang="ts">
import cloneDeep from 'lodash/cloneDeep'

import constants from '@/constants'
import BnglText from '@/components/shared/bngl-text'
import { Observable } from '@/types'
import { AxiosResponse } from 'axios'
import { get as getr } from '@/services/api'

import { StructureBase } from '@/types'

const { defaultSolverConfig } = constants
const { spatialSampling } = defaultSolverConfig.tetexact

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
]

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
]

export default {
  name: 'spatial-sampling-conf',
  components: {
    'bngl-text': BnglText, //eslint-disable-line
  },
  props: ['value'],
  async created() {
    this.observables_ = await this.getObservables()
    this.structures_ = await this.getStructures()
  },

  data() {
    return {
      observableColumns,
      structureColumns,
      // add default value for spatialSampling because
      // sim config saved in older versions of the app
      // doesn't have this property
      conf: Object.assign(cloneDeep(spatialSampling), this.value || {}),
      observables_: [],
      structures_: [],
    }
  },
  methods: {
    async getObservables() {
      const model = this.$store.state.model

      if (!model?.id) return []

      const res: AxiosResponse<Observable[]> = await getr('observables', {
        user_id: model?.user_id,
        model_id: model?.id,
      })

      return res.data
    },

    async getStructures() {
      const model = this.$store.state.model

      if (!model?.id) return []

      const res: AxiosResponse<StructureBase[]> = await getr('structures', {
        user_id: model?.user_id,
        model_id: model?.id,
      })

      return res.data
    },

    onStructureSelectionChange(structures) {
      this.conf.structures = structures
      this.onChange()
    },
    onObservableSelectionChange(observables) {
      this.conf.observables = observables
      this.onChange()
    },
    onChange() {
      this.$emit('input', { ...this.conf })
    },
  },
  computed: {
    structures() {
      return this.structures_.map((st) => ({
        ...st,
        _checked: !!this.conf.structures.find((s) => s.name === st.name),
      }))
    },
    observables() {
      return this.observables_.map((ob) => ({
        ...ob,
        _checked: !!this.conf.observables.find((o) => o.name === ob.name),
      }))
    },
  },
  watch: {
    value() {
      this.conf = Object.assign(cloneDeep(spatialSampling), this.value || {})
    },
  },
}
</script>

<style lang="scss" scoped>
.small-table {
  line-height: 24px;
}
</style>
