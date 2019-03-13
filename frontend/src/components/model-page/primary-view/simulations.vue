
<template>
  <div class="h-100 pos-relative o-hidden">

    <div class="block-head">
      <h3>Simulations</h3>
    </div>

    <div class="block-main" ref="mainBlock">
      <i-table
        highlight-row
        :no-data-text="emptyTableText"
        :height="tableHeight"
        :columns="columns"
        :data="filteredSimulations"
        @on-current-change="onSimulationSelect"
      />
    </div>

    <div class="block-footer">
      <Row>
        <i-col span="12">
          <i-button
            type="primary"
            @click="addSimulation"
          >
            New Simulation
          </i-button>
          <i-button
            class="ml-12"
            type="default"
            :disabled="!selectedSimulation"
            @click="copySimulation"
          >
            Copy
          </i-button>
          <i-button
            class="ml-24 mr-24"
            type="warning"
            :disabled="!selectedSimulation"
            @click="removeSimulation"
          >
            Delete
          </i-button>

          <ButtonGroup class="mr-24">
            <i-button
              type="primary"
              :disabled="!runBtnAvailable"
              @click="runSimulation"
            >
              Run
            </i-button>
            <i-button
              type="default"
              :disabled="!cancelBtnAvailable"
              @click="cancelSimulation"
            >
              Stop
            </i-button>
          </ButtonGroup>

          <ButtonGroup>
            <i-button
              type="primary"
              :disabled="!traceGraphBtnAvailable"
              @click="showSimGraph"
            >
              Graph
            </i-button>
            <i-button
              :disabled="!selectedSimulation || !selectedSimulation.log"
              @click="showSimLogs"
            >
              Log
            </i-button>
          </ButtonGroup>
        </i-col>

        <i-col span="12">
          <i-input
            search
            v-model="searchStr"
            placeholder="Search"
          />
        </i-col>
      </Row>
    </div>

    <Modal
      v-model="newSimulationModalVisible"
      title="New Simulation"
      width="680"
      class-name="vertical-center-modal modal-height-400"
      @on-ok="onOk"
    >
      <simulation-form
        ref="simulationForm"
        v-model="newSimulation"
      />
      <div slot="footer">
        <i-button
          class="mr-6"
          type="text"
          @click="hideNewSimulationModal"
        >
          Cancel
        </i-button>
        <i-button
          type="primary"
          :disabled="!newSimulation.valid"
          @click="onOk"
        >
          OK
        </i-button>
      </div>
    </Modal>

    <Modal
      title="Simulation result"
      v-model="simTraceViewerVisible"
      fullscreen
    >
      <sim-trace-viewer
        v-if="simTraceViewerVisible"
        :sim-id="selectedSimulation.id"
      />
    </Modal>

    <Modal
      title="Simulation logs"
      v-model="simLogViewerVisible"
      fullscreen
    >
      <sim-log-viewer
        v-if="simLogViewerVisible"
        :sim-id="selectedSimulation.id"
      />
    </Modal>

  </div>
</template>


<script>
  import { mapState } from 'vuex';
  import get from 'lodash/get';
  import pick from 'lodash/pick';
  import uuidv1 from 'uuid/v1';

  import bus from '@/services/event-bus';

  import SimulationForm from '@/components/shared/entities/simulation-form.vue';
  import SimTraceViewer from '@/components/shared/sim-trace-viewer.vue';
  import SimLogViewer from '@/components/shared/sim-log-viewer.vue';

  import findUniqName from '@/tools/find-uniq-name';
  import constants from '@/constants';
  import objStrSearchFilter from '@/tools/obj-str-search-filter';
  import blockHeightWoPadding from '@/tools/block-height-wo-padding';

  const { SimSolver, SimStatus } = constants;

  const defaultSimulation = {
    valid: false,
    id: null,
    clientId: null,
    modelId: null,
    status: SimStatus.CREATED,
    name: null,
    solver: null,
    solverConf: null,
    annotation: '',
    times: [],
    values: [],
    log: null,
  };

  const simulationStatusText = {
    created: 'Created',
    readyToRun: 'Ready to run',
    queued: 'Queued',
    started: 'Started',
    cancelled: 'Cancelled',
    error: 'Error',
    finished: 'Finished',
  };

  export default {
    name: 'simulations-component',
    components: {
      'simulation-form': SimulationForm,
      'sim-trace-viewer': SimTraceViewer,
      'sim-log-viewer': SimLogViewer,
    },
    data() {
      return {
        constants,
        searchStr: '',
        tableHeight: null,
        simTraceViewerVisible: false,
        simLogViewerVisible: false,
        newSimulationModalVisible: false,
        newSimulation: Object.assign({}, defaultSimulation),
        columns: [{
          title: 'Name',
          key: 'name',
        }, {
          title: 'Solver',
          key: 'solver',
          maxWidth: 160,
        }, {
          title: 't_end',
          maxWidth: 160,
          render: (h, params) => h('span', params.row.solverConf.tEnd),
        }, {
          title: 'n_steps',
          key: 'nSteps',
          maxWidth: 160,
        }, {
          title: 'Status',
          maxWidth: 120,
          render: (h, params) => h('span', simulationStatusText[params.row.status]),
        }, {
          title: 'Annotation',
          render: (h, params) => h('span', params.row.annotation.split('\n')[0]),
        }],
      };
    },
    mounted() {
      this.$nextTick(() => this.$nextTick(() => this.computeTableHeight(), 0));
      bus.$on('layoutChange', () => this.computeTableHeight());
    },
    beforeDestroy() {
      bus.$off('layoutChange');
    },
    methods: {
      addSimulation() {
        this.newSimulation = Object.assign({
          valid: true,
          id: uuidv1(),
          clientId: this.$store.state.user.id,
          modelId: this.$store.state.model.id,
          status: SimStatus.CREATED,
          name: findUniqName(this.entities, 'sim'),
          solver: SimSolver.NFSIM,
          solverConf: Object.assign({}, constants.DefaultSolverConfig[SimSolver.NFSIM]),
        }, defaultSimulation);
        this.showNewSimulationModal();

        this.$nextTick(() => {
          this.$refs.simulationForm.focus();
        });
      },
      showNewSimulationModal() {
        this.newSimulationModalVisible = true;
      },
      hideNewSimulationModal() {
        this.newSimulationModalVisible = false;
      },
      removeSimulation() {
        this.$store.dispatch('removeSelectedEntity');
      },
      copySimulation() {
        Object.assign(this.newSimulation, {
          name: `Copy of ${this.selectedSimulation.name}`,
          id: uuidv1(),
          status: SimStatus.CREATED,
          values: [],
          times: [],
          log: null,
        }, pick(this.selectedSimulation, ['clientId', 'modelId', 'solver', 'solverConf', 'annotation']));
        this.onOk();
      },
      onSimulationSelect(simulation) {
        this.$store.commit('setEntitySelection', { type: 'simulation', entity: simulation });
      },
      onOk() {
        this.newSimulationModalVisible = false;
        this.$store.dispatch('addSimulation', this.newSimulation);
      },
      runSimulation() {
        this.$store.dispatch('runSimulation', this.selectedSimulation);
      },
      cancelSimulation() {
        this.$store.dispatch('cancelSimulation', this.selectedSimulation);
      },
      computeTableHeight() {
        this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock);
      },
      showSimGraph() {
        this.simTraceViewerVisible = true;
      },
      showSimLogs() {
        this.simLogViewerVisible = true;
      },
    },
    computed: mapState({
      simulations(state) {
        return state.model.simulations;
      },
      filteredSimulations() {
        return this.simulations.filter(e => objStrSearchFilter(this.searchStr, e, ['name', 'definition']));
      },
      emptyTableText() {
        return this.searchStr ? 'No matching simulations' : 'Create a simulation by using buttons below';
      },
      selectedSimulation(state) {
        const selectedEntityType = get(state, 'selectedEntity.type');
        return selectedEntityType === 'simulation' ? state.selectedEntity.entity : null;
      },
      runBtnAvailable() {
        return get(this, 'selectedEntity.status') === SimStatus.CREATED;
      },
      cancelBtnAvailable() {
        const status = get(this, 'selectedEntity.status', null);
        return [SimStatus.QUEUED, SimStatus.STARTED].includes(status);
      },
      traceGraphBtnAvailable() {
        if (!this.selectedSimulation) return false;

        if (
          this.selectedSimulation.solver === SimSolver.STEPS
          && [
            SimStatus.STARTED,
            SimStatus.FINISHED,
          ].includes(this.selectedSimulation.status)
        ) return true;

        if (
          this.selectedSimulation.solver === SimSolver.NFSIM
          && this.selectedSimulation.status === SimStatus.FINISHED
        ) return true;

        return false;
      },
    }),
  };
</script>


<style lang="scss">
  .modal-height-400 {
    .ivu-modal-body {
      height: 400px;
      overflow-y: scroll;
    }
  }
</style>
