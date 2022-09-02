<template>
  <split v-if="$store.state.model.id">
    <template v-slot:primary>
      <div class="h-100 pos-relative o-hidden">
        <div class="block-head">
          <h3>Parameters</h3>
        </div>

        <div class="block-main" ref="mainBlock">
          <i-table
            highlight-row
            :no-data-text="emptyTableText"
            :height="tableHeight"
            :columns="columns"
            :data="filteredParameters"
            @on-row-click="onParameterSelect"
          />
        </div>

        <div class="block-footer">
          <Row>
            <i-col span="12">
              <i-button type="primary" @click="addParameter"> New Parameter </i-button>
              <i-button class="ml-24" type="warning" :disabled="!currentParameter.id" @click="removeParameter">
                Delete
              </i-button>
              <div v-if="deleteError" style="margin-left: 8px; color: red; display: inline-block">
                An error ocurred please try again
              </div>
            </i-col>
            <i-col span="12">
              <i-input search v-model="searchStr" placeholder="Search" />
            </i-col>
          </Row>
        </div>

        <Modal v-model="newParameterModalVisible" title="New Parameter" class-name="vertical-center-modal">
          <parameter-form ref="parameterForm" v-model="currentParameter" @on-submit="onOk" />
          <div slot="footer">
            <i-button class="mr-6" type="text" @click="hideNewParameterModal"> Cancel </i-button>
            <i-button type="primary" :disabled="!currentParameter.valid" @click="onOk"> OK </i-button>
            <div v-if="error" style="margin-left: 8px; color: red; display: inline-block">
              An error ocurred please try again
            </div>
          </div>
        </Modal>
      </div>
    </template>

    <template v-slot:secondary>
      <parameter-properties v-if="currentParameter.id" v-model="currentParameter" :error="error" @apply="onOk" />
      <div v-else class="h-100 p-12">
        <p>Select parameter view/edit properties</p>
      </div>
    </template>
  </split>
  <div v-else style="margin-left: 20px; margin-top: 10px; font-size: 16px">Load a model to view its parameters</div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import get from 'lodash/get'
import { get as getr, post, patch, del } from '@/services/api'
import { Parameter } from '@/types'
import { AxiosResponse } from 'axios'

import bus from '@/services/event-bus'

import BnglText from '@/components/shared/bngl-text.vue'
import Split from '@/components/split.vue'
import ParameterForm from '@/components/shared/entities/parameter-form.vue'
import ParameterProperties from '@/components/model-page/secondary-view/parameter-properties.vue'

import findUniqName from '@/tools/find-uniq-name'
import objStrSearchFilter from '@/tools/obj-str-search-filter'
import blockHeightWoPadding from '@/tools/block-height-wo-padding'

const defaultParameter = {
  id: undefined,
  valid: false,
  name: '',
  definition: '',
  unit: null,
  annotation: '',
}

const searchProps = ['name', 'definition']

export default {
  name: 'parameters-component',
  components: {
    split: Split,
    'parameter-properties': ParameterProperties,
    'parameter-form': ParameterForm,
  },
  data() {
    return {
      error: false,
      deleteError: false,
      parameters: [],
      searchStr: '',
      tableHeight: null,
      newParameterModalVisible: false,
      currentParameter: { ...defaultParameter },
      columns: [
        {
          title: 'Name',
          key: 'name',
          maxWidth: 300,
        },
        {
          title: 'BioNetGen definition',
          render: (h, params) =>
            h(BnglText, {
              props: {
                entityType: 'parameter',
                value: params.row.definition,
              },
            }),
        },
        {
          title: 'Unit',
          render: (h, params) => h('span', get(params, 'row.unit.val'), ''),
          maxWidth: 80,
        },
        {
          title: 'Annotation',
          render: (h, params) => h('span', get(params, 'row.annotation', '').split('\n')[0]),
        },
      ],
    }
  },
  async created() {
    this.parameters = await this.getParameters()
  },
  mounted() {
    this.timeoutId = setTimeout(() => this.computeTableHeight(), 0)
    bus.$on('layoutChange', () => this.computeTableHeight())
  },
  beforeDestroy() {
    clearTimeout(this.timeoutId)
    bus.$off('layoutChange')
  },
  methods: {
    async getParameters() {
      const model = this.$store.state.model

      if (!model?.id) return []

      const res: AxiosResponse<Parameter[]> = await getr('parameters', {
        user_id: model?.user_id,
        model_id: model?.id,
      })

      return res.data
    },
    addParameter() {
      this.currentParameter = {
        ...defaultParameter,
        name: findUniqName(this.parameters, 'p'),
      }
      this.showNewParameterModal()

      this.$nextTick(() => {
        this.$refs.parameterForm.refresh()
        this.$refs.parameterForm.focus()
      })
    },
    async removeParameter() {
      const model = this.$store.state.model
      const res = await del<null>(`parameterss/${this.currentParameter.id}`)
      if (!res) {
        this.deleteError = true
        return
      }

      this.deleteError = false

      this.currentParameter = { ...defaultParameter }
      this.parameters = await this.getParameters()
    },
    onParameterSelect(parameter: Parameter) {
      this.currentParameter = parameter
    },
    async onOk() {
      this.error = false

      const model_id = this.$store.state.model?.id
      let res: AxiosResponse<Parameter> | undefined

      if (!this.currentParameter.id) res = await post<Parameter>('parameters', { ...this.currentParameter, model_id })
      else res = await patch<Parameter>(`parameters/${this.currentParameter.id}`, this.currentParameter)

      if (!res) {
        this.error = true
        return
      }

      this.hideNewParameterModal()

      this.parameters = await this.getParameters()
    },
    showNewParameterModal() {
      this.newParameterModalVisible = true
    },
    hideNewParameterModal() {
      this.error = false
      this.newParameterModalVisible = false
    },
    computeTableHeight() {
      this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock)
    },
  },
  computed: {
    modelId() {
      return this.$store.state.model.id
    },
    filteredParameters() {
      return this.parameters.filter((e) => objStrSearchFilter(this.searchStr, e, { include: searchProps }))
    },
    emptyTableText() {
      return this.searchStr ? 'No matching parameters' : 'Create a parameter by using buttons below'
    },
  },
  watch: {
    async modelId() {
      this.parameters = await this.getParameters()
    },

    currentParameter() {
      this.error = false
      this.deleteError = false
    },
  },
}
</script>
