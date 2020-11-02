<template>
  <div class="p-12">
    <h3>Structure properties</h3>

    <structure-form
      class="mt-12"
      ref="structureForm"
      v-model="tmpEntity"
      @on-submit="applyStructureChange"
    />

    <div class="actions-block">
      <i-button
        class="mr-12"
        type="warning"
        :disabled="!structureEdited"
        @click="resetStructureChange"
      >
        Reset
      </i-button>

      <i-button type="primary" :disabled="!structureEdited" @click="applyStructureChange">
        Apply
      </i-button>
    </div>
  </div>
</template>

<script>
  import isEqualBy from '@/tools/is-equal-by';
  import constants from '@/constants';

  import StructureForm from '@/components/shared/entities/structure-form.vue';

  export default {
    name: 'structure-properties',
    components: {
      'structure-form': StructureForm,
    },
    data() {
      return {
        constants,
        tmpEntity: this.getTmpEntity(),
      };
    },
    mounted() {
      this.focusStructureForm();
    },
    methods: {
      focusStructureForm() {
        this.$nextTick(() => this.$refs.structureForm.focus());
      },
      applyStructureChange() {
        this.$store.commit('modifySelectedEntity', this.tmpEntity);
      },
      resetStructureChange() {
        this.tmpEntity = this.getTmpEntity();
      },
      getTmpEntity() {
        return { ...this.$store.state.selectedEntity.entity };
      },
    },
    computed: {
      structureEdited() {
        return !isEqualBy(this.selection.entity, this.tmpEntity, [
          'name',
          'type',
          'parentName',
          'size',
          'annotation',
          'geometryStructureName',
        ]);
      },
      selection() {
        return this.$store.state.selectedEntity;
      },
    },
    watch: {
      selection() {
        this.tmpEntity = this.getTmpEntity();
        this.focusStructureForm();
      },
    },
  };
</script>

<style lang="scss" scoped>
  .action-block {
    padding-left: 100px;
  }
</style>
