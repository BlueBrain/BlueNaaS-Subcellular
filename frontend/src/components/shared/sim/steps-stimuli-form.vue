
<template>
  <div>
    <i-table
      class="stimuli-table"
      highlight-row
      no-data-text="No stimuli"
      :columns="tableColumns"
      :data="stimuli"
    >
      <template slot-scope="{ row, index }" slot="action">
        <Icon
          class="cursor-pointer"
          type="md-close"
          @click="removeStimulus(index)"
        />
      </template>
    </i-table>

    <Row
      class="p-6 mt-12"
      :gutter="6"
    >
      <i-col span="3">
        <InputNumber
          placeholder="Time, s"
          v-model="stimulus.t"
          :min="0"
        />
      </i-col>

      <i-col span="5">
        <i-select
          v-model="stimulus.type"
          :transfer="true"
          placeholder="Operation"
          @on-change="onStimTypeChange"
        >
          <i-option
            v-for="stimType in stimulusTypes"
            :key="stimType.type"
            :value="stimType.type"
          >
            {{ stimType.label }}
          </i-option>
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
          <i-option
            v-for="parameter in parameters"
            :value="parameter.name"
            :key="parameter.name"
          >
            {{ parameter.name }}
          </i-option>
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
        <InputNumber
          v-if="!stimulus.type || stimulus.type === 'setParam' || stimulus.type === 'setConc'"
          v-model="stimulus.value"
          placeholder="value"
          :min="0"
        />
        <i-select
          v-else
          v-model="stimulus.value"
          placeholder="value"
        >
          <i-option :value="1">True</i-option>
          <i-option :value="0">False</i-option>
        </i-select>
      </i-col>

      <i-col span="3">
        <i-button
          type="default"
          long
          :disabled="!addStimulusBtnEnabled"
          @click="addStimulus"
        >
          Add
        </i-button>
      </i-col>
    </Row>

    <div class="p-6 mt-6">
      <i-button
        @click="onImportClick"
      >
        Import from file
      </i-button>
    </div>

    <Modal
      title="Import stimuli from a file"
      class-name="vertical-center-modal"
      v-model="importModalVisible"
    >
      <stimuli-import @on-import="onImport"/>
    </Modal>
  </div>
</template>


<script>
  import sortBy from 'lodash/sortBy';

  import StepsStimuliImport from './steps-stimuli-import.vue';
  import constants from '@/constants';

  const { StimulusTypeEnum: StimType } = constants;

  const stimulusTypes = [{
    type: StimType.SET_PARAM,
    label: 'set param',
  }, {
    type: StimType.SET_CONC,
    label: 'set conc',
  }, {
    type: StimType.CLAMP_CONC,
    label: 'clamp conc',
  }];

  const tableColumns = [{
    title: 'Time, s',
    key: 't',
    width: 70,
  }, {
    title: 'Operation',
    key: 'type',
    width: 110,
  }, {
    title: 'Target',
    key: 'target',
    width: 200,
  }, {
    title: 'Value',
    key: 'value',
  }, {
    title: ' ',
    slot: 'action',
    width: 40,
  }];

  const defaultStimulus = {
    t: null,
    type: null,
    target: null,
    value: null,
  };

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
        stimuli: this.value.slice(),
        stimulus: Object.assign({}, defaultStimulus),
        importModalVisible: false,
      };
    },
    methods: {
      addStimulus() {
        this.stimuli.push(this.stimulus);
        this.stimuli = sortBy(this.stimuli, stimulus => stimulus.t);
        this.setDefaultStimulusValue();
        this.onStimuliChange();
      },
      removeStimulus(index) {
        this.stimuli.splice(index, 1);
      },
      setDefaultStimulusValue() {
        this.stimulus = Object.assign({}, defaultStimulus);
      },
      onStimTypeChange() {
        Object.assign(this.stimulus, { target: null, value: null });
      },
      onStimuliChange() {
        this.$emit('input', this.stimuli.slice());
      },
      onImportClick() {
        this.importModalVisible = true;
      },
      onImport(stimuli) {
        this.stimuli = stimuli;
        this.importModalVisible = false;
        this.onStimuliChange();
      },
    },
    computed: {
      parameters() {
        return this.$store.state.model.parameters;
      },
      addStimulusBtnEnabled() {
        const {
          t,
          type,
          target,
          value,
        } = this.stimulus;

        return t && type && target && typeof value === 'number';
      },
    },
    watch: {
      value() {
        this.stimuli = this.value.slice();
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
