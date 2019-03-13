
<template>
  <div class="p-12">
    <h3>Species properties</h3>

    <species-form
      class="mt-12"
      ref="speciesForm"
      v-model="tmpEntity"
      @on-submit="applySpeciesChange"
    />

    <div class="action-block">
      <i-button
        class="mr-12"
        type="warning"
        :disabled="!speciesEdited"
        @click="resetSpeciesChange"
      >
        Reset
      </i-button>

      <i-button
        type="primary"
        :disabled="!speciesEdited"
        @click="applySpeciesChange"
      >
        Apply
      </i-button>
    </div>

  </div>
</template>


<script>
  import isEqualBy from '@/tools/is-equal-by';

  import SpeciesForm from '@/components/shared/entities/species-form.vue';


  export default {
    name: 'species-properties',
    components: {
      'species-form': SpeciesForm,
    },
    data() {
      return {
        tmpEntity: this.getTmpEntity(),
      };
    },
    mounted() {
      this.focusForm();
    },
    methods: {
      focusForm() {
        this.$nextTick(() => this.$refs.speciesForm.focus());
      },
      applySpeciesChange() {
        this.$store.commit('modifySelectedEntity', this.tmpEntity);
      },
      resetSpeciesChange() {
        this.tmpEntity = this.getTmpEntity();
      },
      getTmpEntity() {
        return Object.assign({}, this.$store.state.selectedEntity.entity);
      },
    },
    computed: {
      speciesEdited() {
        return !isEqualBy(this.selection.entity, this.tmpEntity, ['name', 'definition', 'concentration', 'annotation']);
      },
      selection() {
        return this.$store.state.selectedEntity;
      },
    },
    watch: {
      selection() {
        this.tmpEntity = this.getTmpEntity();
        this.focusForm();
      },
    },
  };
</script>


<style lang="scss" scoped>
  .action-block {
    padding-left: 100px;
  }
</style>
