<template>
  <split v-if="$store.state.model.id">
    <template v-slot:primary>
      <div class="h-100 pos-relative o-hidden">
        <div class="block-head">
          <h3>Observables</h3>
        </div>

        <div class="block-main" ref="mainBlock">
          <i-table
            highlight-row
            :no-data-text="emptyTableText"
            :height="tableHeight"
            :columns="columns"
            :data="filteredEntities"
            @on-row-click="onObservableSelect"
          />
        </div>

        <div class="block-footer">
          <Row>
            <i-col span="12">
              <i-button type="primary" @click="add"> New Observable </i-button>
              <i-button class="ml-24" type="warning" :disabled="!current.id" @click="remove"> Delete </i-button>
            </i-col>
            <i-col span="12">
              <i-input search v-model="searchStr" placeholder="Search" />
            </i-col>
          </Row>
        </div>

        <Modal
          v-model="newObservableModalVisible"
          title="New Reaction"
          class-name="vertical-center-modal"
          @on-ok="onOk"
        >
          <observable-form ref="observableForm" v-model="current" @on-submit="onOk" />
          <div slot="footer">
            <i-button class="mr-6" type="text" @click="hideNewObservableModal"> Cancel </i-button>
            <i-button type="primary" :disabled="!current.valid" @click="onOk"> OK </i-button>
          </div>
        </Modal>
      </div>
    </template>
    <template v-slot:secondary>
      <properties v-if="current.id" v-model="current" :error="error" @apply="onOk" />
      <div v-else class="h-100 p-12">
        <p>Select observable to view/edit properties</p>
      </div>
    </template>
  </split>
  <div v-else style="margin-left: 20px; margin-top: 10px; font-size: 16px">Load a model to view its observables</div>
</template>

<script lang="ts">
import get from 'lodash/get'
import { get as getr, post, patch, del } from '@/services/api'
import { Observable } from '@/types'
import { AxiosResponse } from 'axios'

import bus from '@/services/event-bus'

import BnglText from '@/components/shared/bngl-text.vue'
import ObservableForm from '@/components/shared/entities/observable-form.vue'
import Split from '@/components/split.vue'
import Properties from '@/components/model-page/secondary-view/observable-properties.vue'

import findUniqName from '@/tools/find-uniq-name'
import objStrSearchFilter from '@/tools/obj-str-search-filter'
import blockHeightWoPadding from '@/tools/block-height-wo-padding'

const defaultObservable = {
  id: undefined,
  name: '',
  valid: false,
  definition: '',
  annotation: '',
}

const searchProps = ['name', 'definition']

export default {
  name: 'observables-component',
  components: {
    split: Split,
    properties: Properties,
    'observable-form': ObservableForm,
  },
  data() {
    return {
      error: false,
      deleteError: false,
      observables: [],
      searchStr: '',
      tableHeight: null,
      newObservableModalVisible: false,
      current: { ...defaultObservable },
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
                entityType: 'observable',
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
    this.observables = await this.getObservables()
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
    async getObservables() {
      const model = this.$store.state.model

      if (!model?.id) return []

      const res: AxiosResponse<Observable[]> = await getr('observables', {
        user_id: model?.user_id,
        model_id: model?.id,
      })

      return res.data
    },

    add() {
      this.current = {
        ...defaultObservable,
        name: findUniqName(this.observables, 'o'),
      }
      this.showNewObservableModal()

      this.$nextTick(() => {
        this.$refs.observableForm.refresh()
        this.$refs.observableForm.focus()
      })
    },

    async remove() {
      const res = await del<null>(`observables/${this.current.id}`)
      if (!res) {
        this.deleteError = true
        return
      }

      this.deleteError = false

      this.current = { ...defaultObservable }
      this.observables = await this.getObservables()
    },
    showNewObservableModal() {
      this.newObservableModalVisible = true
    },
    hideNewObservableModal() {
      this.newObservableModalVisible = false
    },
    onObservableSelect(observable: Observable) {
      this.current = observable
    },
    async onOk() {
      this.error = false

      const model_id = this.$store.state.model?.id
      let res: AxiosResponse<Observable> | undefined

      if (!this.current.id) res = await post<Observable>('observables', { ...this.current, model_id })
      else res = await patch<Observable>(`observables/${this.current.id}`, this.current)

      if (!res) {
        this.error = true
        return
      }

      this.hideNewObservableModal()

      this.observables = await this.getObservables()
    },
    computeTableHeight() {
      const main = this.$refs.mainBlock
      if (main) this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock)
    },
  },
  computed: {
    filteredEntities() {
      return this.observables.filter((e) => objStrSearchFilter(this.searchStr, e, { include: searchProps }))
    },
    emptyTableText() {
      return this.searchStr ? 'No matching observables' : 'Create a observable by using buttons below'
    },
  },
}
</script>
