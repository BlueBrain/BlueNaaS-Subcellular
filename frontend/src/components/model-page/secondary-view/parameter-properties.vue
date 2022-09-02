<template>
  <div class="p-12">
    <h3>Parameter properties</h3>

    <parameter-form
      class="mt-12"
      ref="parameterForm"
      v-model="modifiedParam"
      @on-submit="applyParameterChange"
      @input="onInput"
    />

    <div class="action-block">
      <i-button class="mr-12" type="warning" :disabled="!parameterEdited" @click="resetParameterChange">
        Reset
      </i-button>

      <i-button type="primary" :disabled="!parameterEdited" @click="applyParameterChange"> Apply </i-button>
      <div v-if="error" style="color: red">An error ocurred, try again.</div>
    </div>
  </div>
</template>

<script lang="ts">
import isEqualBy from '@/tools/is-equal-by'

import ParameterForm from '@/components/shared/entities/parameter-form.vue'

export default {
  name: 'parameter-properties',
  props: ['value', 'error'],
  components: {
    'parameter-form': ParameterForm,
  },
  data() {
    return {
      modifiedParam: this.value,
      oParam: this.value,
    }
  },
  mounted() {
    this.focusNameInput()
  },
  methods: {
    focusNameInput() {
      this.$nextTick(() => this.$refs.parameterForm.focus())
    },
    onInput() {
      this.$emit('input', this.modifiedParam)
    },
    applyParameterChange() {
      this.$emit('apply')
    },
    resetParameterChange() {
      this.modifiedParam = this.oParam
    },
  },
  computed: {
    parameterEdited() {
      return !isEqualBy(this.modifiedParam, this.oParam, ['name', 'definition', 'unit', 'annotation'])
    },
  },
  watch: {
    value(val, oldVal) {
      if (val.id !== oldVal.id) {
        this.modifiedParam = val
        this.oParam = val
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
