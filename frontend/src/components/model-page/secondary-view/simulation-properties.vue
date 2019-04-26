
<template>
  <div class="p-12">
    <h3>Simulation config</h3>

    <simulation-form
      class="mt-12"
      ref="simulationForm"
      v-model="tmpEntity"
      @on-submit="applySimulationChange"
    />

    <div class="action-block">
      <i-button
        class="mr-12"
        type="warning"
        :disabled="!simulationEdited"
        @click="resetSimulationChange"
      >
        Reset
      </i-button>

      <i-button
        type="primary"
        :disabled="!simulationEdited || !tmpEntity.valid"
        @click="applySimulationChange"
      >
        Apply
      </i-button>
    </div>

  </div>
</template>


<script>
  import isEqualBy from '@/tools/is-equal-by';

  import SimulationForm from '@/components/shared/entities/simulation-form.vue';


  export default {
    name: 'simulation-properties',
    components: {
      'simulation-form': SimulationForm,
    },
    data() {
      return {
        tmpEntity: this.getTmpEntity(),
      };
    },
    mounted() {
      this.focusNameInput();
    },
    methods: {
      focusNameInput() {
        this.$nextTick(() => this.$refs.simulationForm.focus());
      },
      applySimulationChange() {
        this.$store.dispatch('modifySelectedEntity', this.tmpEntity);
      },
      resetSimulationChange() {
        this.tmpEntity = this.getTmpEntity();
      },
      getTmpEntity() {
        return Object.assign({}, this.$store.state.selectedEntity.entity);
      },
    },
    computed: {
      simulationEdited() {
        return !isEqualBy(this.selection.entity, this.tmpEntity, ['name', 'solverConf', 'annotation']);
      },
      selection() {
        return this.$store.state.selectedEntity;
      },
    },
    watch: {
      selection() {
        this.tmpEntity = this.getTmpEntity();
        this.focusNameInput();
      },
    },
  };
</script>


<style lang="scss" scoped>
  .action-block {
    padding-left: 100px;
  }
</style>
