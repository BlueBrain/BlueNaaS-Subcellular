<template>
  <split v-if="$store.state.model.id">
    <template v-slot:primary>
      <div class="h-100 pos-relative o-hidden">
        <div class="block-head">
          <h3>Molecules</h3>
        </div>

        <div class="block-main" ref="mainBlock">
          <i-table
            highlight-row
            :no-data-text="emptyTableText"
            :height="tableHeight"
            :columns="columns"
            :data="filteredMolecules"
            @on-row-click="onSelect"
          />
        </div>

        <div class="block-footer">
          <Row>
            <i-col span="12">
              <i-button type="primary" @click="add"> New Molecule </i-button>
              <i-button class="ml-24" type="warning" :disabled="!currentMolecule.id" @click="remove"> Delete </i-button>
            </i-col>
            <i-col span="12">
              <i-input search v-model="searchStr" placeholder="Search" />
            </i-col>
          </Row>
        </div>

        <Modal v-model="newMoleculeModalVisible" title="New Molecule" class-name="vertical-center-modal" @on-ok="onOk">
          <molecule-form ref="moleculeForm" v-model="currentMolecule" @on-submit="onOk" />
          <div slot="footer">
            <i-button class="mr-6" type="text" @click="hideModal"> Cancel </i-button>
            <i-button type="primary" :disabled="!currentMolecule.valid" @click="onOk"> OK </i-button>
          </div>
        </Modal>
      </div>
    </template>
    <template v-slot:secondary>
      <molecule-properties v-if="currentMolecule.id" v-model="currentMolecule" :error="error" @apply="onOk" />
      <div v-else class="h-100 p-12">
        <p>Select molecules to view/edit properties</p>
      </div>
    </template>
  </split>
  <div v-else style="margin-left: 20px; margin-top: 10px; font-size: 16px">Load a model to view its molecules</div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import get from 'lodash/get'
import { get as getr, post, patch, del } from '@/services/api'
import { Molecule } from '@/types'
import { AxiosResponse } from 'axios'

import bus from '@/services/event-bus'

import BnglText from '@/components/shared/bngl-text.vue'
import MoleculeForm from '@/components/shared/entities/molecule-form.vue'
import Split from '@/components/split.vue'
import MoleculeProperties from '@/components/model-page/secondary-view/molecule-properties.vue'

import findUniqName from '@/tools/find-uniq-name'
import objStrSearchFilter from '@/tools/obj-str-search-filter'
import blockHeightWoPadding from '@/tools/block-height-wo-padding'

const defaultMolecule = {
  id: undefined,
  name: '',
  valid: false,
  definition: '',
  annotation: '',
}

const searchProps = ['name', 'definition']

export default {
  name: 'molecules-component',
  components: {
    split: Split,
    'molecule-properties': MoleculeProperties,
    'molecule-form': MoleculeForm,
  },
  data() {
    return {
      error: false,
      deleteError: false,
      molecules: [],
      searchStr: '',
      tableHeight: null,
      newMoleculeModalVisible: false,
      currentMolecule: { ...defaultMolecule },
      columns: [
        {
          title: 'Name',
          key: 'name',
          maxWidth: 400,
        },
        {
          title: 'BioNetGen definition',
          render: (h, params) =>
            h(BnglText, {
              props: {
                entityType: 'molecule',
                value: params.row.definition,
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
    const model = this.$store.state.model
    let res: AxiosResponse<Molecule[]>
    if (model?.id) {
      res = await getr('molecules', { user_id: model?.user_id, model_id: model?.id })
      this.molecules = res.data
    }
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
    add() {
      this.currentMolecule = {
        ...defaultMolecule,
        name: findUniqName(this.molecules, 'f'),
      }
      this.showModal()

      this.$nextTick(() => {
        this.$refs.moleculeForm.refresh()
        this.$refs.moleculeForm.focus()
      })
    },

    async remove() {
      const model = this.$store.state.model
      const res = await del<null>(`molecules/${this.currentMolecule.id}`)
      if (!res) {
        this.deleteError = true
        return
      }

      this.deleteError = false

      this.currentMolecule = { ...defaultMolecule }
      this.molecules = (await getr<Molecule[]>('molecules', { model_id: model?.id })).data
    },
    showModal() {
      this.newMoleculeModalVisible = true
    },
    hideModal() {
      this.newMoleculeModalVisible = false
    },
    onSelect(molecule: Molecule) {
      this.currentMolecule = molecule
    },
    async onOk() {
      this.error = false

      const model_id = this.$store.state.model?.id
      let res: AxiosResponse<Molecule> | undefined

      if (!this.currentMolecule.id) res = await post<Molecule>('molecules', { ...this.currentMolecule, model_id })
      else res = await patch<Molecule>(`molecules/${this.currentMolecule.id}`, this.currentMolecule)

      if (!res) {
        this.error = true
        return
      }

      this.hideModal()

      this.molecules = (await getr<Molecule[]>('molecules', { model_id })).data
    },
    computeTableHeight() {
      this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock)
    },
  },
  computed: mapState({
    filteredMolecules() {
      return this.molecules.filter((e) => objStrSearchFilter(this.searchStr, e, { include: searchProps }))
    },
    emptyTableText() {
      return this.searchStr ? 'No matching molecules' : 'Create a molecule by using buttons below'
    },
  }),
}
</script>
