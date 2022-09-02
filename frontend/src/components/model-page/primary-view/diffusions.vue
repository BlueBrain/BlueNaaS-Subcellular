<template>
  <split v-if="$store.state.model.id">
    <template v-slot:primary>
      <div class="h-100 pos-relative o-hidden">
        <div class="block-head">
          <h3>Diffusions</h3>
        </div>

        <div class="block-main" ref="mainBlock">
          <i-table
            highlight-row
            :no-data-text="emptyTableText"
            :height="tableHeight"
            :columns="columns"
            :data="filteredDiffusions"
            @on-row-click="onDiffusionSelect"
          />
        </div>

        <div class="block-footer">
          <Row>
            <i-col span="12">
              <i-button type="primary" @click="addDiffusion"> New Diffusion </i-button>
              <i-button class="ml-24" type="warning" :disabled="!current.id" @click="removeDiffusion">
                Delete
              </i-button>
            </i-col>
            <i-col span="12">
              <i-input search v-model="searchStr" placeholder="Search" />
            </i-col>
          </Row>
        </div>

        <Modal v-model="newDiffusionModalVisible" title="New Diffusion" class-name="vertical-center-modal">
          <diffusion-form ref="diffusionForm" v-model="current" @on-submit="onOk" />
          <div slot="footer">
            <i-button class="mr-6" type="text" @click="hideNewDiffusionModal"> Cancel </i-button>
            <i-button type="primary" :disabled="!current.valid" @click="onOk"> OK </i-button>
            <div v-if="error" style="margin-left: 8px; color: red; display: inline-block">
              An error ocurred please try again
            </div>
          </div>
        </Modal>
      </div>
    </template>
    <template v-slot:secondary>
      <properties v-if="current.id" v-model="current" :error="error" @apply="onOk" />
      <div v-else class="h-100 p-12">
        <p>Select a diffusion to view/edit properties</p>
      </div>
    </template>
  </split>
  <div v-else style="margin-left: 20px; margin-top: 10px; font-size: 16px">Load a model to view its diffusions</div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import get from 'lodash/get'
import { get as getr, post, patch, del } from '@/services/api'
import { Diffusion } from '@/types'
import { AxiosResponse } from 'axios'

import bus from '@/services/event-bus'

import BnglText from '@/components/shared/bngl-text.vue'
import DiffusionForm from '@/components/shared/entities/diffusion-form.vue'
import Split from '@/components/split.vue'
import Properties from '@/components/model-page/secondary-view/diffusion-properties.vue'

import findUniqName from '@/tools/find-uniq-name'
import objStrSearchFilter from '@/tools/obj-str-search-filter'
import blockHeightWoPadding from '@/tools/block-height-wo-padding'

const defaultDiffusion = {
  id: undefined,
  valid: false,
  name: '',
  species_definition: '',
  diffusion_constant: '',
  compartment: '',
  annotation: '',
}

const searchProps = ['name', 'speciesDefinition', 'compartment']

export default {
  name: 'diffusion-component',
  components: {
    split: Split,
    properties: Properties,
    'diffusion-form': DiffusionForm,
  },
  data() {
    return {
      error: false,
      deleteError: false,
      diffusions: [],
      searchStr: '',
      tableHeight: null,
      newDiffusionModalVisible: false,
      current: { ...defaultDiffusion },
      columns: [
        {
          title: 'Name',
          key: 'name',
          maxWidth: 180,
        },
        {
          title: 'Compartment',
          key: 'compartment',
          maxWidth: 180,
        },
        {
          title: 'Species BNG definition',
          render: (h, params) =>
            h(BnglText, {
              props: {
                entityType: 'diffusion',
                value: params.row.species_definition,
              },
            }),
        },
        {
          title: 'Diffusion constant',
          render: (h, params) =>
            h(BnglText, {
              props: {
                entityType: 'parameter',
                value: params.row.diffusion_constant,
              },
            }),
        },
        {
          title: 'Annotation',
          render: (h, params) => h('span', get(params, 'row.annotation', '').split('\n')[0]),
        },
      ],
    }
  },
  async created() {
    this.diffusions = await this.getDiffusions()
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
    async getDiffusions() {
      const model = this.$store.state.model

      if (!model?.id) return []

      const res: AxiosResponse<Diffusion[]> = await getr('diffusions', {
        user_id: model?.user_id,
        model_id: model?.id,
      })

      return res.data.map((d) => ({ ...d, diffusion_constant: d.diffusion_constant.toString() }))
    },

    addDiffusion() {
      this.current = {
        ...defaultDiffusion,
        name: findUniqName(this.diffusions, 'r'),
      }
      this.showNewDiffusionModal()

      this.$nextTick(() => {
        this.$refs.diffusionForm.refresh()
        this.$refs.diffusionForm.focus()
      })
    },
    async removeDiffusion() {
      const res = await del<null>(`diffusions/${this.current.id}`)
      if (!res) {
        this.deleteError = true
        return
      }

      this.deleteError = false

      this.current = { ...defaultDiffusion }
      this.diffusions = await this.getDiffusions()
    },
    onDiffusionSelect(diffusion: Diffusion) {
      this.current = diffusion
    },
    async onOk() {
      this.error = false

      const model_id = this.$store.state.model?.id
      let res: AxiosResponse<Diffusion> | undefined

      const current = { ...this.current, diffusion_constant: Number(this.current.diffusion_constant) }

      if (!this.current.id) res = await post<Diffusion>('diffusions', { ...current, model_id })
      else res = await patch<Diffusion>(`diffusions/${this.current.id}`, this.current)

      if (!res) {
        this.error = true
        return
      }

      this.hideNewDiffusionModal()

      this.diffusions = await this.getDiffusions()
    },
    hideNewDiffusionModal() {
      this.newDiffusionModalVisible = false
    },
    showNewDiffusionModal() {
      this.newDiffusionModalVisible = true
    },
    computeTableHeight() {
      this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock)
    },
  },
  computed: mapState({
    filteredDiffusions() {
      return this.diffusions.filter((e) => objStrSearchFilter(this.searchStr, e, { include: searchProps }))
    },
    emptyTableText() {
      return this.searchStr ? 'No matching diffusions' : 'Create a diffusion by using buttons below'
    },
  }),
}
</script>
