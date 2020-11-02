<template>
  <div class="p-12">
    <h3>Function properties</h3>

    <function-form class="mt-12" ref="functionForm" v-model="tmpEntity" @on-submit="applyFunctionChange" />

    <div class="action-block">
      <i-button class="mr-12" type="warning" :disabled="!functionEdited" @click="resetFunctionChange"> Reset </i-button>
      <i-button type="primary" :disabled="!functionEdited" @click="applyFunctionChange"> Apply </i-button>
    </div>
  </div>
</template>

<script>
import isEqualBy from '@/tools/is-equal-by'

import FunctionForm from '@/components/shared/entities/function-form.vue'

export default {
  name: 'function-properties',
  components: {
    'function-form': FunctionForm,
  },
  data() {
    return {
      tmpEntity: this.getTmpEntity(),
    }
  },
  mounted() {
    this.focusNameInput()
  },
  methods: {
    focusNameInput() {
      this.$nextTick(() => this.$refs.functionForm.focus())
    },
    applyFunctionChange() {
      this.$store.commit('modifySelectedEntity', this.tmpEntity)
    },
    resetFunctionChange() {
      this.tmpEntity = this.getTmpEntity()
    },
    getTmpEntity() {
      return Object.assign({}, this.$store.state.selectedEntity.entity)
    },
  },
  computed: {
    functionEdited() {
      return !isEqualBy(this.selection.entity, this.tmpEntity, ['name', 'definition', 'annotation'])
    },
    selection() {
      return this.$store.state.selectedEntity
    },
  },
  watch: {
    selection() {
      this.tmpEntity = this.getTmpEntity()
      this.focusNameInput()
    },
  },
}
</script>

<style lang="scss" scoped>
.action-block {
  padding-left: 100px;
}
</style>
