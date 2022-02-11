<template>
  <div>
    <i-form :label-width="100" @submit.native.prevent>
      <Row>
        <i-col span="12">
          <FormItem label="Name *">
            <i-input size="small" ref="nameInput" v-model="simulation.name" @input="onSimulationChange" />
          </FormItem>
        </i-col>
        <i-col span="12">
          <FormItem label="Solver *">
            <i-select v-model="simulation.solver" @on-change="onSolverChange">
              <i-option
                v-for="simSolver of solvers"
                :value="simSolver"
                :key="simSolver"
                :disabled="Boolean(getInvalidReason(simSolver))"
              >
                {{ `${solverLabel[simSolver]} ${getInvalidReason(simSolver)}` }}
              </i-option>
            </i-select>
          </FormItem>
        </i-col>
      </Row>
    </i-form>

    <div v-if="simulation.solverConf">
      <steps-conf-form
        v-if="simulation.solver === 'tetexact' || simulation.solver === 'tetopsplit'"
        v-model="simulation.solverConf"
        @input="onSimulationChange"
      />
      <nfsim-conf-form
        v-else-if="['nfsim', 'ode', 'ssa'].includes(simulation.solver)"
        v-model="simulation.solverConf"
        @input="onSimulationChange"
      />
    </div>

    <i-form :label-width="100" @submit.native.prevent>
      <FormItem label="Annotation">
        <i-input size="small" type="textarea" autosize v-model="simulation.annotation" @input="onSimulationChange" />
      </FormItem>
    </i-form>
  </div>
</template>

<script lang="ts">
import { Solver } from '@/types' //eslint-disable-line no-unused-vars

import StepsConfForm from '@/components/shared/sim/steps-conf-form.vue'
import NfsimConfForm from '@/components/shared/sim/nfsim-conf-form.vue'

const solverLabel = {
  nfsim: 'NFsim',
  tetexact: 'STEPS: Tetexact',
  tetopsplit: 'STEPS: Tetoptsplit',
  ode: 'BNG: ode',
  ssa: 'BNG: ssa',
}

export default {
  name: 'simulation-form',
  props: ['value'],
  components: {
    'steps-conf-form': StepsConfForm,
    'nfsim-conf-form': NfsimConfForm,
  },
  data() {
    return {
      solvers: ['tetexact', 'tetopsplit', 'nfsim', 'ode', 'ssa'],
      simulation: { ...this.value },
      solverLabel,
    }
  },
  methods: {
    onSolverChange() {
      this.simulation.solverConf = {
        valid: true,
        dt: 0.01,
        tEnd: 10,
        stimulation: {
          size: 0,
          targetValues: [],
          data: [],
        },
        spatialSampling: {
          enabled: false,
          structures: [],
          observables: [],
        },
      }
      this.onSimulationChange()
    },
    onSimulationChange() {
      this.simulation.valid = this.isValid()
      this.$emit('input', this.simulation)
    },
    isValid() {
      return this.simulation.name.trim() && this.simulation.solverConf.valid && this.simulation.solver
    },
    focus() {
      this.$refs.nameInput.focus()
    },
    getInvalidReason(solver: Solver) {
      if (!this.solvers.includes(solver)) throw new Error(`Unrecognized solver ${solver}`)
      if (solver === 'nfsim' && this.model.nonBnglStructures) return 'Non compliant BNG structs'
      if ((solver === 'tetexact' || solver === 'tetopsplit') && !this.model.geometry) return 'No geometry provided'
      return ''
    },
  },
  computed: {
    model() {
      return this.$store.state.model
    },
  },
  watch: {
    value() {
      this.simulation = { ...this.value }
    },
  },
}
</script>
