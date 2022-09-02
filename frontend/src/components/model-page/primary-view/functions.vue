<template>
  <split v-if="$store.state.model.id">
    <template v-slot:primary>
      <div class="h-100 pos-relative o-hidden">
        <div class="block-head">
          <h3>Functions</h3>
        </div>

        <div class="block-main" ref="mainBlock">
          <i-table
            highlight-row
            :no-data-text="emptyTableText"
            :height="tableHeight"
            :columns="columns"
            :data="filteredFunctions"
            @on-row-click="onFunctionSelect"
          />
        </div>

        <div class="block-footer">
          <Row>
            <i-col span="12">
              <i-button type="primary" @click="addFunction"> New Function </i-button>
              <i-button class="ml-24" type="warning" :disabled="!currentFunction.id" @click="removeFunction">
                Delete
              </i-button>
            </i-col>
            <i-col span="12">
              <i-input search v-model="searchStr" placeholder="Search" />
            </i-col>
          </Row>
        </div>

        <Modal v-model="newFunctionModalVisible" title="New Function" class-name="vertical-center-modal" @on-ok="onOk">
          <function-form ref="functionForm" v-model="currentFunction" @on-submit="onOk" />
          <div slot="footer">
            <i-button class="mr-6" type="text" @click="hideNewFunctionModal"> Cancel </i-button>
            <i-button type="primary" :disabled="!currentFunction.valid" @click="onOk"> OK </i-button>
          </div>
        </Modal>
      </div>
    </template>
    <template v-slot:secondary>
      <function-properties v-if="currentFunction.id" v-model="currentFunction" :error="error" @apply="onOk" />
      <div v-else class="h-100 p-12">
        <p>Select function to view/edit properties</p>
      </div>
    </template>
  </split>
  <div v-else style="margin-left: 20px; margin-top: 10px; font-size: 16px">Load a model to view its functions</div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import get from 'lodash/get'
import { get as getr, post, patch, del } from '@/services/api'
import { Function } from '@/types'
import { AxiosResponse } from 'axios'

import bus from '@/services/event-bus'

import BnglText from '@/components/shared/bngl-text.vue'
import Split from '@/components/split.vue'
import FunctionProperties from '@/components/model-page/secondary-view/function-properties.vue'
import FunctionForm from '@/components/shared/entities/function-form.vue'

import findUniqName from '@/tools/find-uniq-name'
import objStrSearchFilter from '@/tools/obj-str-search-filter'
import blockHeightWoPadding from '@/tools/block-height-wo-padding'

const defaultFunction = {
  id: undefined,
  name: '',
  valid: false,
  definition: '',
  argument: '',
  annotation: '',
}

const searchProps = ['name', 'definition']

export default {
  name: 'function-component',
  components: {
    split: Split,
    'function-properties': FunctionProperties,
    'function-form': FunctionForm,
  },
  data() {
    return {
      error: false,
      deleteError: false,
      functions: [],
      searchStr: '',
      tableHeight: null,
      newFunctionModalVisible: false,
      currentFunction: { ...defaultFunction },
      columns: [
        {
          title: 'Name',
          key: 'name',
          maxWidth: 240,
        },
        {
          title: 'Arg',
          key: 'argument',
          maxWidth: 120,
        },
        {
          title: 'BioNetGen definition',
          render: (h, params) =>
            h(BnglText, {
              props: {
                entityType: 'function',
                value: params.row.definition,
              },
            }),
        },
        {
          title: 'Annotation',
          maxWidth: 240,
          render: (h, params) => h('span', get(params, 'row.annotation', '').split('\n')[0]),
        },
      ],
    }
  },
  async created() {
    const model = this.$store.state.model
    let funcRes: AxiosResponse<Function>
    if (model?.id) {
      funcRes = await getr('functions', { user_id: model?.user_id, model_id: model?.id })
      this.functions = funcRes.data
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
    addFunction() {
      this.currentFunction = {
        ...defaultFunction,
        name: findUniqName(this.functions, 'f'),
      }
      this.showNewFunctionModal()

      this.$nextTick(() => {
        this.$refs.functionForm.refresh()
        this.$refs.functionForm.focus()
      })
    },

    async removeFunction() {
      const model = this.$store.state.model
      const res = await del<null>(`functions/${this.currentFunction.id}`)
      if (!res) {
        this.deleteError = true
        return
      }

      this.deleteError = false

      this.currentFunction = { ...defaultFunction }
      this.functions = (await getr<Function[]>('functions', { model_id: model?.id })).data
    },
    showNewFunctionModal() {
      this.newFunctionModalVisible = true
    },
    hideNewFunctionModal() {
      this.newFunctionModalVisible = false
    },
    onFunctionSelect(func: Function) {
      this.currentFunction = func
    },
    async onOk() {
      this.error = false

      const model_id = this.$store.state.model?.id
      let res: AxiosResponse<Function> | undefined

      if (!this.currentFunction.id) res = await post<Function>('functions', { ...this.currentFunction, model_id })
      else res = await patch<Function>(`functions/${this.currentFunction.id}`, this.currentFunction)

      if (!res) {
        this.error = true
        return
      }

      this.hideNewFunctionModal()

      this.functions = (await getr<Function[]>('functions', { model_id })).data
    },
    computeTableHeight() {
      this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock)
    },
  },
  computed: mapState({
    filteredFunctions() {
      return this.functions.filter((e) => objStrSearchFilter(this.searchStr, e, { include: searchProps }))
    },
    emptyTableText() {
      return this.searchStr ? 'No matching functions' : 'Create a function by using buttons below'
    },
  }),
  watch: {
    currentFunction() {
      console.log(this.currentFunction)
    },
  },
}
</script>
