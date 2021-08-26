<template>
  <div class="h-100 pos-relative o-hidden">
    <div class="block-head">
      <h3>Simulations</h3>
    </div>

    <div class="block-main" ref="mainBlock">
      <i-table
        ref="table"
        highlight-row
        :no-data-text="emptyTableText"
        :height="tableHeight"
        :columns="columns"
        :data="filteredSimulations"
        @on-row-click="onSimulationSelect"
      />
    </div>

    <div class="block-footer">
      <Row>
        <i-col span="12">
          <i-button type="primary" @click="addSimulation"> New Simulation </i-button>
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
            <i-button type="primary" :disabled="!runBtnAvailable" @click="runSimulation">
              Run
            </i-button>
            <i-button type="default" :disabled="!cancelBtnAvailable" @click="cancelSimulation">
              Stop
            </i-button>
          </ButtonGroup>

          <ButtonGroup>
            <i-button type="primary" :disabled="!traceGraphBtnAvailable" @click="showSimGraph">
              Graph
            </i-button>
            <i-button :disabled="!logBtnAvailable" @click="showSimLogs"> Log </i-button>
          </ButtonGroup>
        </i-col>

        <i-col span="12">
          <i-input search v-model="searchStr" placeholder="Search" />
        </i-col>
      </Row>
    </div>

    <Modal
      v-model="newSimulationModalVisible"
      title="New Simulation"
      width="800"
      class-name="vertical-center-modal modal-height-400"
      @on-ok="onOk"
    >
      <simulation-form ref="simulationForm" v-model="newSimulation" />
      <div slot="footer">
        <i-button class="mr-6" type="text" @click="hideNewSimulationModal"> Cancel </i-button>
        <i-button type="primary" :disabled="!newSimulation.valid" @click="onOk"> OK </i-button>
      </div>
    </Modal>

    <Modal
      title="Simulation result"
      v-model="simTraceViewerVisible"
      fullscreen
      class="modal--no-padding"
    >
      <result-viewer v-if="simTraceViewerVisible" :sim-id="selectedSimulation.id" />

      <div slot="footer">
        <i-button class="wide-button" type="primary" @click="hideSimGraph"> OK </i-button>
      </div>
    </Modal>

    <Modal title="Simulation logs" v-model="simLogViewerVisible" fullscreen>
      <sim-log-viewer v-if="simLogViewerVisible" :sim-id="selectedSimulation.id" />
      <div slot="footer">
        <i-button class="wide-button" type="primary" @click="hideSimLogs"> OK </i-button>
      </div>
    </Modal>
  </div>
</template>

<script>
  import { mapState } from 'vuex';
  import get from 'lodash/get';
  import pick from 'lodash/pick';
  import cloneDeep from 'lodash/cloneDeep';
  import { v4 as uuid } from 'uuid';

  import bus from '@/services/event-bus';

  import SimulationForm from '@/components/shared/entities/simulation-form.vue';
  import ResultViewer from '@/components/shared/sim/result-viewer.vue';
  import SimLogViewer from '@/components/shared/sim-log-viewer.vue';

  import findUniqName from '@/tools/find-uniq-name';
  import constants from '@/constants';
  import objStrSearchFilter from '@/tools/obj-str-search-filter';
  import blockHeightWoPadding from '@/tools/block-height-wo-padding';

  const { SimSolver, SimStatus } = constants;

  const searchProps = ['name'];

  const defaultSimulation = {
    valid: false,
    id: null,
    userId: null,
    modelId: null,
    status: SimStatus.CREATED,
    progress: null,
    name: null,
    solver: null,
    solverConf: null,
    annotation: '',
  };

  const simulationStatus = {
    [SimStatus.CREATED]: {
      text: 'Created',
      badgeStatus: 'default',
    },
    [SimStatus.READY_TO_RUN]: {
      text: 'Ready to run',
      badgeStatus: 'processing',
    },
    [SimStatus.QUEUED]: {
      text: 'Queued',
      badgeStatus: 'processing',
    },
    [SimStatus.INIT]: {
      text: 'Sim init',
      badgeStatus: 'processing',
    },
    [SimStatus.STARTED]: {
      text: 'Started',
      badgeStatus: 'processing',
    },
    [SimStatus.CANCELLED]: {
      text: 'Cancelled',
      badgeStatus: 'warning',
    },
    [SimStatus.ERROR]: {
      text: 'Error',
      badgeStatus: 'error',
    },
    [SimStatus.FINISHED]: {
      text: 'Finished',
      badgeStatus: 'success',
    },
  };

  export default {
    name: 'simulations-component',
    components: {
      'simulation-form': SimulationForm,
      'result-viewer': ResultViewer,
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
        newSimulation: { ...defaultSimulation },
        columns: [
          {
            title: 'Name',
            key: 'name',
          },
          {
            title: 'Solver',
            key: 'solver',
            maxWidth: 120,
          },
          {
            title: 'max_dt',
            maxWidth: 120,
            render: (h, params) => h('span', params.row.solverConf.dt),
          },
          {
            title: 't_end',
            maxWidth: 120,
            render: (h, params) => h('span', params.row.solverConf.tEnd),
          },
          {
            title: 'Progress',
            maxWidth: 240,
            slot: 'progress',
            render: (h, params) => {
              const { progress, status } = params.row;

              if (!progress) return h('span', '-');

              let progressStatus;
              switch (status) {
                case SimStatus.STARTED:
                  progressStatus = 'active';
                  break;
                case SimStatus.ERROR:
                  progressStatus = 'wrong';
                  break;
                case SimStatus.FINISHED:
                  progressStatus = 'success';
                  break;
                default:
                  progressStatus = 'normal';
                  break;
              }

              return h('Progress', {
                props: {
                  percent: progress,
                  status: progressStatus,
                  'stroke-width': 5,
                },
              });
            },
          },
          {
            title: 'Status',
            maxWidth: 132,
            render: (h, params) => {
              const statusObj = simulationStatus[params.row.status];
              const tagParams = {
                props: {
                  status: statusObj.badgeStatus,
                  text: statusObj.text,
                },
              };
              return h('Badge', tagParams);
            },
          },
          {
            title: 'Annotation',
            render: (h, params) => h('span', get(params, 'row.annotation', '').split('\n')[0]),
          },
        ],
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
        this.resetNewSimulation();
        this.showNewSimulationModal();

        this.$nextTick(() => {
          this.$refs.simulationForm.focus();
        });
      },
      resetNewSimulation() {
        this.newSimulation = {
          ...cloneDeep(defaultSimulation),
          valid: false,
          id: uuid(),
          userId: this.$store.state.user.id,
          modelId: this.$store.state.model.id,
          name: findUniqName(this.simulations, 'sim'),
        };
      },
      showNewSimulationModal() {
        this.newSimulationModalVisible = true;
      },
      hideNewSimulationModal() {
        this.newSimulationModalVisible = false;
      },
      removeSimulation() {
        this.$store.dispatch('removeSelectedSimulation');
      },
      copySimulation() {
        this.resetNewSimulation();

        const nameWOSuffixR = /^(.*?)(-\d*)?$/;
        const prefixedName = this.selectedSimulation.name.includes('Copy of')
          ? this.selectedSimulation.name
          : `Copy of ${this.selectedSimulation.name}`;

        const name = findUniqName(this.simulations, `${prefixedName.match(nameWOSuffixR)[1]}-`);

        Object.assign(
          this.newSimulation,
          {
            name,
            id: uuid(),
            status: SimStatus.CREATED,
          },
          pick(this.selectedSimulation, [
            'userId',
            'modelId',
            'solver',
            'solverConf',
            'annotation',
          ]),
        );
        this.onOk();
      },
      onSimulationSelect(tableSimulation, index) {
        const simulation = this.$store.state.model.simulations[index];
        this.$store.commit('setEntitySelection', {
          index,
          type: 'simulation',
          entity: simulation,
        });
      },
      onOk() {
        this.newSimulationModalVisible = false;
        this.$store.dispatch('addSimulation', this.newSimulation);
        this.$store.commit('setEntitySelection', {
          index: this.filteredSimulations.length - 1,
          type: 'simulation',
          entity: this.newSimulation,
        });
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
      hideSimGraph() {
        this.simTraceViewerVisible = false;
      },
      showSimLogs() {
        this.simLogViewerVisible = true;
      },
      hideSimLogs() {
        this.simLogViewerVisible = false;
      },
    },
    computed: mapState({
      simulations(state) {
        return state.model.simulations.map((sim) => {
          const solverConf = pick(sim.solverConf, ['tEnd', 'dt']);
          const props = ['name', 'solver', 'nSteps', 'status', 'progress', 'annotation'];
          const strippedSim = pick(sim, props);
          return { ...strippedSim, ...{ solverConf } };
        });
      },
      filteredSimulations() {
        return this.simulations.filter((e) =>
          objStrSearchFilter(this.searchStr, e, { include: searchProps }),
        );
      },
      emptyTableText() {
        return this.searchStr
          ? 'No matching simulations'
          : 'Create a simulation by using buttons below';
      },
      selectedSimulation(state) {
        const selectedEntityType = get(state, 'selectedEntity.type');
        return selectedEntityType === 'simulation' ? state.selectedEntity.entity : null;
      },
      runBtnAvailable() {
        return get(this, 'selectedSimulation.status') === SimStatus.CREATED;
      },
      cancelBtnAvailable() {
        const status = get(this, 'selectedSimulation.status', null);
        return [SimStatus.QUEUED, SimStatus.STARTED].includes(status);
      },
      traceGraphBtnAvailable() {
        if (!this.selectedSimulation) return false;
        if (
          [SimStatus.STARTED, SimStatus.FINISHED, SimStatus.CANCELLED].includes(
            this.selectedSimulation.status,
          )
        )
          return true;

        return false;
      },
      logBtnAvailable() {
        return (
          this.selectedSimulation &&
          [
            SimStatus.INIT,
            SimStatus.STARTED,
            SimStatus.CANCELLED,
            SimStatus.ERROR,
            SimStatus.FINISHED,
          ].includes(this.selectedSimulation.status)
        );
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

  .modal--no-padding {
    .ivu-modal-body {
      padding: 0;
    }
  }
</style>
