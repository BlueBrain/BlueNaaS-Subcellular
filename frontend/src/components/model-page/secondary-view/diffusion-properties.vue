<template>
  <div class="p-12">
    <h3>Diffusion properties</h3>

    <diffusion-form
      class="mt-12"
      ref="diffusionForm"
      v-model="modified"
      @on-submit="applyDiffusionChange"
      @input="onInput"
    />

    <div class="action-block">
      <i-button class="mr-12" type="warning" :disabled="!diffusionEdited" @click="resetDiffusionChange">
        Reset
      </i-button>

      <i-button type="primary" :disabled="!diffusionEdited" @click="applyDiffusionChange"> Apply </i-button>
      <div v-if="error" style="color: red">An error ocurred, try again.</div>
    </div>
  </div>
</template>

<script lang="ts">
import isEqualBy from '@/tools/is-equal-by'

import DiffusionForm from '@/components/shared/entities/diffusion-form.vue'

export default {
  name: 'diffusion-properties',
  components: {
    'diffusion-form': DiffusionForm,
  },
  props: ['value', 'error'],
  data() {
    return {
      modified: this.value,
      original: this.value,
    }
  },
  mounted() {
    this.focusNameInput()
  },
  methods: {
    focusNameInput() {
      this.$nextTick(() => this.$refs.diffusionForm.focus())
    },
    onInput() {
      this.$emit('input', this.modified)
    },
    applyDiffusionChange() {
      this.$emit('apply')
    },
    resetDiffusionChange() {
      this.modified = this.original
    },
  },
  computed: {
    diffusionEdited() {
      return !isEqualBy(this.modified, this.original, [
        'name',
        'speciesDefinition',
        'diffusionConstant',
        'compartment',
        'annotation',
      ])
    },
  },
  watch: {
    value(val, oldVal) {
      if (val.id !== oldVal.id) {
        this.modified = val
        this.original = val
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
