<template>
  <div>
    <i-table
      v-if="!largeStimulation"
      class="stimuli-table"
      highlight-row
      no-data-text="No stimuli"
      :columns="tableColumns"
      :data="stimuli"
    >
      <template slot-scope="{ row, index }" slot="action">
        <Icon class="cursor-pointer" type="md-close" @click="removeStimulus(index)" />
      </template>
      <template slot-scope="{ row }" slot="value">
        <span v-if="row.type === 'clampConc'">
          {{ row.value ? 'On' : 'Off' }}
        </span>
        <span v-else>
          {{ row.value }}
        </span>
      </template>
    </i-table>

    <p v-else class="ml-6">Stimuli set is too big to display</p>

    <Row v-if="!largeStimulation" class="p-6 mt-6" :gutter="6">
      <i-col span="3">
        <InputNumber v-model="stimulus.t" placeholder="Time, s" :min="0" :active-change="false" />
      </i-col>

      <i-col span="5">
        <i-select v-model="stimulus.type" :transfer="true" placeholder="Operation" @on-change="onStimTypeChange">
          <i-option v-for="stimType in stimulusTypes" :key="stimType.type" :value="stimType.type">{{
            stimType.label
          }}</i-option>
        </i-select>
      </i-col>

      <i-col span="9">
        <i-select
          v-if="!stimulus.type || stimulus.type === 'setParam'"
          v-model="stimulus.target"
          placeholder="Parameter"
          filterable
          :transfer="true"
          not-found-text="No parameters in the model"
        >
          <i-option v-for="parameter in parameters" :value="parameter.name" :key="parameter.name">{{
            parameter.name
          }}</i-option>
        </i-select>
        <i-input v-else-if="stimulus.type === 'setConc'" v-model="stimulus.target" placeholder="Species definition" />
        <i-input
          v-else-if="stimulus.type === 'clampConc'"
          v-model="stimulus.target"
          placeholder="Molecule definition"
        />
      </i-col>

      <i-col span="4">
        <InputNumber
          v-if="!stimulus.type || stimulus.type === 'setParam' || stimulus.type === 'setConc'"
          v-model="stimulus.value"
          placeholder="value"
          :min="0"
          :active-change="false"
        />
        <i-select v-else v-model="stimulus.value" placeholder="value">
          <i-option :value="1">On</i-option>
          <i-option :value="0">Off</i-option>
        </i-select>
      </i-col>

      <i-col span="3">
        <i-button type="default" long :disabled="!addStimulusBtnEnabled" @click="addStimulus"> Add </i-button>
      </i-col>
    </Row>

    <div class="p-6 mt-6">
      <i-button @click="onImportClick"> Import from file </i-button>

      <i-button class="ml-12" type="warning" @click="onClearClick"> Clear </i-button>
    </div>

    <Modal title="Import stimuli from a file" class-name="vertical-center-modal" v-model="importModalVisible">
      <stimuli-import @on-import="onImport" />
    </Modal>
  </div>
</template>

<script lang="ts">
import sortBy from 'lodash/sortBy'

import constants from '@/constants'
import tools from '@/tools/model-tools'
import StepsStimuliImport from './steps-stimulation-import.vue'

import { get as getr } from '@/services/api'
import { Parameter } from '@/types'
import { AxiosResponse } from 'axios'

const { StimulusTypeEnum: StimType } = constants

const stimulusTypes = [
  {
    type: StimType.SET_PARAM,
    label: 'set param',
  },
  {
    type: StimType.SET_CONC,
    label: 'set conc',
  },
  {
    type: StimType.CLAMP_CONC,
    label: 'clamp conc',
  },
]

const tableColumns = [
  {
    title: 'Time, s',
    key: 't',
    maxWidth: 140,
  },
  {
    title: 'Operation',
    key: 'type',
    width: 110,
  },
  {
    title: 'Target',
    key: 'target',
    maxWidth: 280,
  },
  {
    title: 'Value',
    slot: 'value',
  },
  {
    title: ' ',
    slot: 'action',
    width: 40,
  },
]

const defaultStimulus = {
  t: null,
  type: null,
  target: null,
  value: null,
}

export default {
  name: 'steps-stimuli-form',
  props: ['value'],
  components: {
    'stimuli-import': StepsStimuliImport,
  },
  data() {
    return {
      tableColumns,
      stimulusTypes,
      largeStimulation: false,
      stimuli: [],
      stimulation: {
        size: 0,
        data: [],
        targetValues: [],
      },
      stimulus: { ...defaultStimulus },
      importModalVisible: false,
      parameters: [],
    }
  },
  mounted() {
    this.init()
  },
  methods: {
    async init() {
      this.stimulation = { ...this.value }
      this.largeStimulation = this.value.size > 100
      this.stimuli = this.getStimuli()

      this.parameters = await this.getParameters()
    },

    async getParameters() {
      const model = this.$store.state.model

      if (!model?.id) return []

      const res: AxiosResponse<Parameter[]> = await getr('parameters', {
        user_id: model?.user_id,
        model_id: model?.id,
      })

      return res.data
    },

    getStimuli() {
      return this.stimulation.size < 100 ? tools.decompressStimulation(this.stimulation) : []
    },
    addStimulus() {
      this.stimuli.push(this.stimulus)
      this.stimuli = sortBy(this.stimuli, (stimulus) => stimulus.t)
      this.setDefaultStimulusValue()
      this.updateStimulation()
      this.onStimuliChange()
    },
    removeStimulus(index) {
      this.stimuli.splice(index, 1)
      this.updateStimulation()
      this.onStimuliChange()
    },
    setDefaultStimulusValue() {
      this.stimulus = { ...defaultStimulus }
    },
    onStimTypeChange() {
      Object.assign(this.stimulus, { target: null, value: null })
    },
    onStimuliChange() {
      this.$emit('input', { ...this.stimulation })
    },
    onImportClick() {
      this.importModalVisible = true
    },
    onImport(stimulation) {
      this.stimulation = stimulation
      this.largeStimulation = stimulation.size > 100
      this.stimuli = this.getStimuli()
      this.importModalVisible = false
      this.onStimuliChange()
    },
    onClearClick() {
      this.stimuli = []
      this.updateStimulation()
      this.largeStimulation = false
      this.onStimuliChange()
    },
    updateStimulation() {
      this.stimulation = tools.compressStimuli(this.stimuli)
    },
  },
  computed: {
    addStimulusBtnEnabled() {
      const { t, type, target, value } = this.stimulus

      return t && type && target && typeof value === 'number'
    },
  },
  watch: {
    value(stimulation) {
      this.stimulation = { ...stimulation }
      this.stimuli = this.getStimuli()
    },
  },
}
</script>

<style lang="scss">
.stimuli-table {
  border: none;
  line-height: 24px !important;

  .ivu-table:after {
    width: 0px !important;
  }

  .ivu-table-cell {
    padding-left: 12px;
    padding-right: 12px;
  }
}

.cursor-pointer {
  cursor: pointer;
}
</style>
