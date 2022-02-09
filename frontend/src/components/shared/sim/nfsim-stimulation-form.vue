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

    <Row v-if="!largeStimulation" class="p-6 mt-12" :gutter="6">
      <i-col span="3">
        <InputNumber v-model="stimulus.t" placeholder="Time, s" :min="0" :active-change="false" />
      </i-col>

      <i-col span="5">
        <i-select
          v-model="stimulus.type"
          :transfer="true"
          placeholder="Operation"
          @on-change="onStimTypeChange"
        >
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
        <i-input
          v-else-if="stimulus.type === 'setConc'"
          v-model="stimulus.target"
          placeholder="Species definition"
        />
        <i-input
          v-else-if="stimulus.type === 'clampConc'"
          v-model="stimulus.target"
          placeholder="Molecule definition"
        />
      </i-col>

      <i-col span="4">
        <!-- TODO: add support for exponential notation -->
        <InputNumber
          v-if="!stimulus.type || stimulus.type === 'setParam' || stimulus.type === 'setConc'"
          v-model="stimulus.value"
          placeholder="value"
          :min="0"
        />
        <i-select v-else v-model="stimulus.value" placeholder="value">
          <i-option :value="1">On</i-option>
          <i-option :value="0">Off</i-option>
        </i-select>
      </i-col>

      <i-col span="3">
        <i-button type="default" long :disabled="!addStimulusBtnEnabled" @click="addStimulus">
          Add
        </i-button>
      </i-col>
    </Row>

    <div class="p-6 mt-6">
      <i-button @click="onImportClick"> Import from file </i-button>

      <i-button class="ml-12" type="warning" @click="onClearClick"> Clear </i-button>
    </div>

    <Modal
      title="Import stimuli from a file"
      class-name="vertical-center-modal"
      v-model="importModalVisible"
    >
      <stimuli-import @on-import="onImport" />
    </Modal>
  </div>
</template>

<script>
// TODO: cleanup, refactor
import sortBy from 'lodash/sortBy';

import constants from '@/constants';
import tools from '@/tools/model-tools';

import NfsimStimuliImport from './nfsim-stimulation-import.vue';

const { StimulusTypeEnum: StimType } = constants;

const stimulusTypes = [
  {
    type: StimType.SET_PARAM,
    label: 'set param',
  },
];

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
];

const defaultStimulus = {
  t: null,
  type: StimType.SET_PARAM,
  target: null,
  value: null,
};

export default {
  name: 'nfsim-stimuli-form',
  props: ['value'],
  components: {
    'stimuli-import': NfsimStimuliImport,
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
    };
  },
  mounted() {
    this.init();
  },
  methods: {
    init() {
      this.stimulation = { ...this.value };
      this.largeStimulation = this.stimulation.size > 100;
      this.stimuli = this.getStimuli();
    },
    getStimuli() {
      return this.stimulation.size < 100 ? tools.decompressStimulation(this.stimulation) : [];
    },
    addStimulus() {
      this.stimuli.push(this.stimulus);
      this.stimuli = sortBy(this.stimuli, (stimulus) => stimulus.t);
      this.setDefaultStimulusValue();
      this.updateStimulation();
      this.onStimuliChange();
    },
    removeStimulus(index) {
      this.stimuli.splice(index, 1);
      this.updateStimulation();
      this.onStimuliChange();
    },
    setDefaultStimulusValue() {
      this.stimulus = { ...defaultStimulus };
    },
    onStimTypeChange() {
      Object.assign(this.stimulus, { target: null, value: null });
    },
    onStimuliChange() {
      this.$emit('input', { ...this.stimulation });
    },
    onImportClick() {
      this.importModalVisible = true;
    },
    onImport(stimulation) {
      this.stimulation = stimulation;
      this.largeStimulation = stimulation.size > 100;
      this.stimuli = this.getStimuli();
      this.importModalVisible = false;
      this.onStimuliChange();
    },
    onClearClick() {
      this.stimuli = [];
      this.updateStimulation();
      this.largeStimulation = false;
      this.onStimuliChange();
    },
    updateStimulation() {
      this.stimulation = tools.compressStimuli(this.stimuli);
    },
  },
  computed: {
    parameters() {
      return this.$store.state.model.parameters;
    },
    addStimulusBtnEnabled() {
      const { t, type, target, value } = this.stimulus;

      return t && type && target && typeof value === 'number';
    },
  },
  watch: {
    value(stimulation) {
      this.stimulation = { ...stimulation };
      this.stimuli = this.getStimuli();
    },
  },
};
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
