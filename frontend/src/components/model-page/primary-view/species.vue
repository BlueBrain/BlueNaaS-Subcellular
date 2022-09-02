<template>
  <split v-if="$store.state.model.id">
    <template v-slot:primary>
      <div class="h-100 pos-relative o-hidden">
        <div class="block-head">
          <h3>Species</h3>
        </div>

        <div class="block-main" ref="mainBlock">
          <i-table
            highlight-row
            :no-data-text="emptyTableText"
            :height="tableHeight"
            :columns="columns"
            :data="filteredSpecies"
            @on-row-click="onSpeciesSelect"
          />
        </div>

        <div class="block-footer">
          <Row>
            <i-col span="12">
              <i-button type="primary" @click="add"> New Species </i-button>
              <i-button class="ml-24" type="warning" :disabled="!current.id" @click="remove"> Delete </i-button>
            </i-col>
            <i-col span="12">
              <i-input search v-model="searchStr" placeholder="Search" />
            </i-col>
          </Row>
        </div>

        <Modal v-model="newSpeciesModalVisible" title="New Species" class-name="vertical-center-modal" @on-ok="onOk">
          <species-form ref="speciesForm" v-model="current" @on-submit="onOk" />
          <div slot="footer">
            <i-button class="mr-6" type="text" @click="hideNewSpeciesModal"> Cancel </i-button>
            <i-button type="primary" :disabled="!current.valid" @click="onOk"> OK </i-button>
          </div>
        </Modal>
      </div>
    </template>
    <template v-slot:secondary>
      <species-properties v-if="current.id" v-model="current" :error="error" @apply="onOk" />
      <div v-else class="h-100 p-12">
        <p>Select species to view/edit properties</p>
      </div>
    </template>
  </split>
  <div v-else style="margin-left: 20px; margin-top: 10px; font-size: 16px">Load a model to view its species</div>
</template>

<script lang="ts">
import get from 'lodash/get'
import { get as getr, post, patch, del } from '@/services/api'
import { Species } from '@/types'
import { AxiosResponse } from 'axios'

import { mapState } from 'vuex'

import bus from '@/services/event-bus'

import BnglText from '@/components/shared/bngl-text.vue'
import SpeciesForm from '@/components/shared/entities/species-form.vue'
import Split from '@/components/split.vue'
import SpeciesProperties from '@/components/model-page/secondary-view/species-properties.vue'

import findUniqName from '@/tools/find-uniq-name'
import objStrSearchFilter from '@/tools/obj-str-search-filter'
import blockHeightWoPadding from '@/tools/block-height-wo-padding'

const defaultSpecies = {
  id: undefined,
  name: '',
  valid: false,
  definition: '',
  concentration: '',
  annotation: '',
}

const searchProps = ['name', 'definition']

export default {
  name: 'species-component',
  components: {
    split: Split,
    'species-properties': SpeciesProperties,
    'species-form': SpeciesForm,
  },
  data() {
    return {
      error: false,
      deleteError: false,
      species: [],
      searchStr: '',
      tableHeight: null,
      newSpeciesModalVisible: false,
      current: { ...defaultSpecies },
      columns: [
        {
          title: 'Name',
          key: 'name',
          maxWidth: 180,
        },
        {
          title: 'Concentration',
          maxWidth: 280,
          render: (h, params) =>
            h(BnglText, {
              props: {
                entityType: 'parameter',
                value: params.row.concentration,
              },
            }),
        },
        {
          title: 'BioNetGen definition',
          render: (h, params) =>
            h(BnglText, {
              props: {
                entityType: 'species',
                value: params.row.definition,
              },
            }),
        },
        {
          title: 'Annotation',
          maxWidth: 260,
          render: (h, params) => h('span', get(params, 'row.annotation', '').split('\n')[0]),
        },
      ],
    }
  },
  async created() {
    this.species = await this.getSpecies()
  },
  mounted() {
    this.timeoutId = window.setTimeout(() => this.computeTableHeight(), 0)
    bus.$on('layoutChange', () => this.computeTableHeight())
  },
  beforeDestroy() {
    window.clearTimeout(this.timeoutId)
    bus.$off('layoutChange')
  },
  methods: {
    async getSpecies() {
      const model = this.$store.state.model

      if (!model?.id) return []

      const res: AxiosResponse<Species[]> = await getr<Species[]>('species', {
        user_id: model?.user_id,
        model_id: model?.id,
      })

      return res.data.map((s) => ({
        ...s,
        concentration: s.concentration.toString(),
      }))
    },

    add() {
      this.current = {
        ...defaultSpecies,
        name: findUniqName(this.species, 's'),
      }
      this.showNewSpeciesModal()

      this.$nextTick(() => {
        this.$refs.speciesForm.refresh()
        this.$refs.speciesForm.focus()
      })
    },

    async remove() {
      const res = await del<null>(`species/${this.current.id}`)
      if (!res) {
        this.deleteError = true
        return
      }

      this.deleteError = false

      this.current = { ...defaultSpecies }
      this.species = await this.getSpecies()
    },
    showNewSpeciesModal() {
      this.newSpeciesModalVisible = true
    },
    hideNewSpeciesModal() {
      this.newSpeciesModalVisible = false
    },

    onSpeciesSelect(species: Species) {
      this.current = species
    },
    async onOk() {
      this.error = false

      const model_id = this.$store.state.model?.id
      let res: AxiosResponse<Species> | undefined

      if (!this.current.id) res = await post<Species>('species', { ...this.current, model_id })
      else res = await patch<Species>(`species/${this.current.id}`, this.current)

      if (!res) {
        this.error = true
        return
      }

      this.hideNewSpeciesModal()

      this.species = await this.getSpecies()
    },
    computeTableHeight() {
      this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock)
    },
  },
  computed: mapState({
    filteredSpecies() {
      return this.species.filter((e) => objStrSearchFilter(this.searchStr, e, { include: searchProps }))
    },
    emptyTableText() {
      return this.searchStr ? 'No matching species' : 'Create a species by using buttons below'
    },
  }),
}
</script>
