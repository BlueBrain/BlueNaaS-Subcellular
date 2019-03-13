
<template>
  <div class="p-12">
    <h3>Observable properties</h3>

    <observable-form
      class="mt-12"
      ref="observableForm"
      v-model="tmpEntity"
      @on-submit="applyObservableChange"
    />

    <div class="action-block">
      <i-button
        class="mr-12"
        type="warning"
        :disabled="!observableEdited"
        @click="resetObservableChange"
      >
        Reset
      </i-button>

      <i-button
        type="primary"
        :disabled="!observableEdited"
        @click="applyObservableChange"
      >
        Apply
      </i-button>
    </div>

  </div>
</template>


<script>
  import isEqualBy from '@/tools/is-equal-by';

  import ObservableForm from '@/components/shared/entities/observable-form.vue';


  export default {
    name: 'observable-properties',
    components: {
      'observable-form': ObservableForm,
    },
    data() {
      return {
        tmpEntity: this.getTmpEntity(),
      };
    },
    mounted() {
      this.focusObservableForm();
    },
    methods: {
      focusObservableForm() {
        this.$nextTick(() => this.$refs.observableForm.focus());
      },
      applyObservableChange() {
        this.$store.commit('modifySelectedEntity', this.tmpEntity);
      },
      resetObservableChange() {
        this.tmpEntity = this.getTmpEntity();
      },
      getTmpEntity() {
        return Object.assign({}, this.$store.state.selectedEntity.entity);
      },
    },
    computed: {
      observableEdited() {
        return !isEqualBy(this.selection.entity, this.tmpEntity, ['name', 'definition', 'annotation']);
      },
      selection() {
        return this.$store.state.selectedEntity;
      },
    },
    watch: {
      selection() {
        this.tmpEntity = this.getTmpEntity();
        this.focusObservableForm();
      },
    },
  };
</script>


<style lang="scss" scoped>
  .action-block {
    padding-left: 100px;
  }
</style>
