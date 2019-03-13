
<template>
  <div class="p-12">
    <h3>Diffusion properties</h3>

    <diffusion-form
      class="mt-12"
      ref="diffusionForm"
      v-model="tmpEntity"
      @on-submit="applyDiffusionChange"
    />

    <div class="action-block">
      <i-button
        class="mr-12"
        type="warning"
        :disabled="!diffusionEdited"
        @click="resetDiffusionChange"
      >
        Reset
      </i-button>

      <i-button
        type="primary"
        :disabled="!diffusionEdited"
        @click="applyDiffusionChange"
      >
        Apply
      </i-button>
    </div>

  </div>
</template>


<script>
  import isEqualBy from '@/tools/is-equal-by';

  import DiffusionForm from '@/components/shared/entities/diffusion-form.vue';


  export default {
    name: 'diffusion-properties',
    components: {
      'diffusion-form': DiffusionForm,
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
        this.$nextTick(() => this.$refs.diffusionForm.focus());
      },
      applyDiffusionChange() {
        this.$store.commit('modifySelectedEntity', this.tmpEntity);
      },
      resetDiffusionChange() {
        this.tmpEntity = this.getTmpEntity();
      },
      getTmpEntity() {
        return Object.assign({}, this.$store.state.selectedEntity.entity);
      },
    },
    computed: {
      diffusionEdited() {
        return !isEqualBy(this.selection.entity, this.tmpEntity, ['name', 'speciesDefinition', 'diffusionConstant', 'compartment', 'annotation']);
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
