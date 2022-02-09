<template>
  <div class="p-12">
    <h3>Parameter properties</h3>

    <parameter-form
      class="mt-12"
      ref="parameterForm"
      v-model="tmpEntity"
      @on-submit="applyParameterChange"
    />

    <div class="action-block">
      <i-button
        class="mr-12"
        type="warning"
        :disabled="!parameterEdited"
        @click="resetParameterChange"
      >
        Reset
      </i-button>

      <i-button type="primary" :disabled="!parameterEdited" @click="applyParameterChange">
        Apply
      </i-button>
    </div>
  </div>
</template>

<script>
import isEqualBy from '@/tools/is-equal-by';

import ParameterForm from '@/components/shared/entities/parameter-form.vue';

export default {
  name: 'parameter-properties',
  components: {
    'parameter-form': ParameterForm,
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
      this.$nextTick(() => this.$refs.parameterForm.focus());
    },
    applyParameterChange() {
      this.$store.commit('modifySelectedEntity', this.tmpEntity);
    },
    resetParameterChange() {
      this.tmpEntity = this.getTmpEntity();
    },
    getTmpEntity() {
      return { ...this.$store.state.selectedEntity.entity };
    },
  },
  computed: {
    parameterEdited() {
      return !isEqualBy(this.selection.entity, this.tmpEntity, [
        'name',
        'definition',
        'unit',
        'annotation',
      ]);
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
