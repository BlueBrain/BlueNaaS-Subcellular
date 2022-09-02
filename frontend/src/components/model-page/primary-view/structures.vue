<template>
  <split v-if="$store.state.model.id">
    <template v-slot:primary>
      <div class="h-100 pos-relative o-hidden">
        <div class="block-head">
          <h3>Structures</h3>
        </div>

        <div class="block-main" ref="mainBlock">
          <i-table
            highlight-row
            :no-data-text="emptyTableText"
            :height="tableHeight"
            :columns="columns"
            :data="filteredStructures"
            @on-row-click="onStructureSelect"
          />
        </div>

        <div class="block-footer">
          <Row>
            <i-col span="12">
              <i-button type="primary" @click="addStructure" :disabled="isPublicModel"> New Structure </i-button>
              <i-button class="ml-24" type="warning" :disabled="!current.id || isPublicModel" @click="removeStructure">
                Delete
              </i-button>
              <div v-if="deleteError" stylxe="margin-left: 8px; color: red; display: inline-block">
                An error ocurred please try again
              </div>
            </i-col>
            <i-col span="12">
              <i-input search v-model="searchStr" placeholder="Search" />
            </i-col>
          </Row>
        </div>
        <Modal
          v-model="newStructureModalVisible"
          title="New Molecule"
          class-name="vertical-center-modal"
          @on-ok="onNewStructureOk"
        >
          <structure-form ref="structureForm" v-model="current" @on-submit="onNewStructureOk" />
          <div slot="footer">
            <i-button class="mr-6" type="text" @click="hideNewStructureModal"> Cancel </i-button>
            <i-button type="primary" :disabled="!current.valid" @click="onNewStructureOk"> OK </i-button>
          </div>
          <div v-if="error" style="margin-left: 8px; color: red; display: inline-block">
            An error ocurred please try again
          </div>
        </Modal>
      </div>
    </template>
    <template v-slot:secondary>
      <structure-properties v-if="current.id" v-model="current" :error="error" @apply="onNewStructureOk" />
      <div v-else class="h-100 p-12">
        <p>Select a structure to view/edit properties</p>
      </div>
    </template>
  </split>
  <div v-else style="margin-left: 20px; margin-top: 10px; font-size: 16px">Load a model to view its structures</div>
</template>

<script lang="ts">
import get from 'lodash/get'
import { get as getr, post, patch, del } from '@/services/api'
import { StructureBase } from '@/types'
import { AxiosResponse } from 'axios'

import bus from '@/services/event-bus'

import objStrSearchFilter from '@/tools/obj-str-search-filter'
import findUniqName from '@/tools/find-uniq-name'
import blockHeightWoPadding from '@/tools/block-height-wo-padding'

import StructureForm from '@/components/shared/entities/structure-form.vue'
import Split from '@/components/split.vue'
import BnglText from '@/components/shared/bngl-text.vue'
import StructureProperties from '@/components/model-page/secondary-view/structure-properties.vue'
import { PUBLIC_USER_ID } from '@/constants'

const defaultStructure = {
  id: undefined,
  name: '',
  valid: false,
  type: 'compartment',
  unit: {
    str: 'm³',
  },
  parentName: '-',
  geometryStructureName: '',
  size: '',
  geometryStructureSize: '',
  annotation: '',
}

const searchProps = ['name', 'type']

export default {
  name: 'structures-component',
  components: {
    split: Split,
    'structure-properties': StructureProperties,
    'structure-form': StructureForm,
  },
  data() {
    return {
      error: false,
      deleteError: false,
      searchStr: '',
      tableHeight: null,
      newStructureModalVisible: false,
      current: { ...defaultStructure },
      structures: [],
    }
  },
  async created() {
    this.structures = await this.getStructures()
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
    async getStructures() {
      const model = this.$store.state.model

      if (!model?.id) return []

      const res: AxiosResponse<StructureBase[]> = await getr('structures', {
        user_id: model?.user_id,
        model_id: model?.id,
      })

      return res.data
    },

    addStructure() {
      this.current = {
        ...defaultStructure,
        name: findUniqName(this.structures, 'r'),
      }
      this.showNewStructureModal()

      this.$nextTick(() => {
        this.$refs.structureForm.refresh()
        this.$refs.structureForm.focus()
      })
    },
    showNewStructureModal() {
      this.newStructureModalVisible = true
    },
    hideNewStructureModal() {
      this.error = false
      this.newStructureModalVisible = false
    },
    async removeStructure() {
      const res = await del<null>(`structures/${this.current.id}`)
      if (!res) {
        this.deleteError = true
        return
      }

      this.deleteError = false

      this.current = { ...defaultStructure }
      this.structures = await this.getStructures()
    },
    onStructureSelect(structure: StructureBase) {
      this.current = structure
    },
    computeTableHeight() {
      this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock)
    },
    async onNewStructureOk() {
      this.error = false

      const model_id = this.$store.state.model?.id

      let res: AxiosResponse<StructureBase> | undefined

      if (!this.current.id) res = await post<StructureBase>('structures', { ...this.current, model_id })
      else res = await patch<StructureBase>(`structures/${this.current.id}`, this.current)

      if (!res) {
        this.error = true
        return
      }

      this.hideNewStructureModal()

      this.structures = await this.getStructures()
    },
  },
  computed: {
    model() {
      return this.$store.state.model
    },
    isPublicModel() {
      return this.model?.user_id === PUBLIC_USER_ID
    },
    filteredStructures() {
      return this.structures.filter((e) => objStrSearchFilter(this.searchStr, e, { include: searchProps }))
    },
    emptyTableText() {
      return this.searchStr ? 'No matching structures' : 'Create a structure by using buttons below'
    },
    geometry() {
      return this.$store.state.model.geometry
    },
    columns() {
      const columns = [
        {
          title: 'Name',
          key: 'name',
        },
        {
          title: 'Type',
          key: 'type',
          maxWidth: 140,
        },
        {
          title: 'Parent',
          key: 'parentName',
        },
        {
          title: this.geometry ? 'Size, m³ (computed from geometry)' : 'Size',
          render: (h, params) =>
            this.geometry && !params.row.geometryStructureSize
              ? h('span', 'NA')
              : h(BnglText, {
                  props: {
                    entityType: 'parameter',
                    value: this.geometry ? params.row.geometryStructureSize || 'NA' : params.row.size,
                  },
                }),
        },
        {
          title: 'Annotation',
          render: (h, params) => h('span', get(params, 'row.annotation', '').split('\n')[0]),
        },
      ]

      if (this.geometry) {
        columns.splice(3, 0, {
          title: 'Geometry structure',
          render: (h, params) =>
            h('span', {
              class: { 'text-error': !params.row.geometryStructureName },
              domProps: {
                innerHTML: params.row.geometryStructureName || 'Not set',
              },
            }),
        })
      }

      return columns
    },
  },

  watch: {
    async model() {
      this.structures = await this.getStructures()
    },
    current() {
      this.error = false
      this.deleteError = false
    },
  },
}
</script>
