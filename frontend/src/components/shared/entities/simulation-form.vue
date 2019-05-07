
<template>
  <div>
    <i-form
      :label-width="100"
      @submit.native.prevent
    >
      <Row>
        <i-col span="12">
          <FormItem
            label="Name *"
          >
            <i-input
              size="small"
              ref="nameInput"
              v-model="simulation.name"
              @input="onSimulationChange"
            />
          </FormItem>
        </i-col>
        <i-col span="12">
          <FormItem label="Solver *">
            <i-select
              v-model="simulation.solver"
              @on-change="onSolverChange"
            >
              <i-option
                v-for="simSolver in SimSolver"
                :value="simSolver"
                :key="simSolver"
                :disabled="!solverState(simSolver).enabled"
              >
                {{ getSolverSelectLabel(simSolver) }}
              </i-option>
            </i-select>
          </FormItem>
        </i-col>
      </Row>
    </i-form>

    <div v-if="simulation.solverConf">
      <steps-conf-form
        v-if="simulation.solver === SimSolver.STEPS"
        v-model="simulation.solverConf"
        @input="onSimulationChange"
      />
      <nfsim-conf-form
        v-else-if="simulation.solver === SimSolver.NFSIM"
        v-model="simulation.solverConf"
        @input="onSimulationChange"
      />
    </div>

    <i-form
      :label-width="100"
      @submit.native.prevent
    >
      <FormItem label="Annotation">
        <i-input
          size="small"
          type="textarea"
          autosize
          v-model="simulation.annotation"
          @input="onSimulationChange"
        />
      </FormItem>
    </i-form>
  </div>
</template>


<script>
  import constants from '@/constants';

  import StepsConfForm from '@/components/shared/sim/steps-conf-form.vue';
  import NfsimConfForm from '@/components/shared/sim/nfsim-conf-form.vue';

  const { defaultSolverConfig, SimSolver } = constants;

  const solverLabel = {
    [SimSolver.NFSIM]: 'NFsim',
    [SimSolver.STEPS]: 'STEPS',
  };

  export default {
    name: 'simulation-form',
    props: ['value'],
    components: {
      'steps-conf-form': StepsConfForm,
      'nfsim-conf-form': NfsimConfForm,
    },
    data() {
      return {
        SimSolver,
        simulation: Object.assign({}, this.value),
      };
    },
    methods: {
      onSolverChange() {
        const { solver } = this.simulation;
        this.simulation.solverConf = Object.assign({ valid: true }, defaultSolverConfig[solver]);
        this.onSimulationChange();
      },
      onSimulationChange() {
        this.simulation.valid = this.isValid();
        this.$emit('input', this.simulation);
      },
      isValid() {
        return this.simulation.name.trim()
          && this.simulation.solverConf.valid
          && this.simulation.solver;
      },
      focus() {
        this.$refs.nameInput.focus();
      },
      getSolverSelectLabel(solver) {
        const solverState = this.solverState(solver);
        return solverLabel[solver]
          + (solverState.reason ? ` (${solverState.reason})` : '');
      },
    },
    computed: {
      solverState() {
        return this.$store.getters.solverState;
      },
    },
    watch: {
      value() {
        this.simulation = Object.assign({}, this.value);
      },
    },
  };
</script>
