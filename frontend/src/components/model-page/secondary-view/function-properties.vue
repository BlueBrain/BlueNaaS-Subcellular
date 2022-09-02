<template>
  <div class="p-12">
    <h3>Function properties</h3>

    <function-form
      class="mt-12"
      ref="functionForm"
      v-model="modifiedFunction"
      @on-submit="applyFunctionChange"
      @input="onInput"
    />

    <div class="action-block">
      <i-button class="mr-12" type="warning" :disabled="!functionEdited" @click="resetFunctionChange"> Reset </i-button>
      <i-button type="primary" :disabled="!functionEdited" @click="applyFunctionChange"> Apply </i-button>
      <div v-if="error" style="color: red">An error ocurred, try again.</div>
    </div>
  </div>
</template>

<script lang="ts">
import isEqualBy from '@/tools/is-equal-by'

import FunctionForm from '@/components/shared/entities/function-form.vue'

export default {
  name: 'function-properties',
  props: ['value', 'error'],
  components: {
    'function-form': FunctionForm,
  },
  data() {
    return {
      modifiedFunction: this.value,
      oFunction: this.value,
    }
  },
  mounted() {
    this.focusNameInput()
  },
  methods: {
    focusNameInput() {
      this.$nextTick(() => this.$refs.functionForm.focus())
    },
    onInput() {
      this.$emit('input', this.modifiedFunction)
    },
    applyFunctionChange() {
      this.$emit('apply')
    },
    resetFunctionChange() {
      this.modifiedFunction = this.oFunction
    },
  },
  computed: {
    functionEdited() {
      return !isEqualBy(this.modifiedFunction, this.oFunction, ['name', 'definition', 'annotation'])
    },
  },
  watch: {
    value(val, oldVal) {
      if (val.id !== oldVal.id) {
        this.modifiedFunction = val
        this.oFunction = val
        this.focusNameInput()
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.action-block {
  padding-left: 100px;
}
</style>
