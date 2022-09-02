<template>
  <div class="p-12">
    <h3>Molecule properties</h3>

    <molecule-form ref="moleculeForm" class="mt-12" v-model="modified" @on-submit="apply" @input="onInput" />

    <div class="action-block">
      <i-button class="mr-12" type="warning" :disabled="!edited" @click="reset"> Reset </i-button>

      <i-button type="primary" :disabled="!edited" @click="apply"> Apply </i-button>
      <div v-if="error" style="color: red">An error ocurred, try again.</div>
    </div>
  </div>
</template>

<script lang="ts">
import isEqualBy from '@/tools/is-equal-by'

import MoleculeForm from '@/components/shared/entities/molecule-form.vue'

export default {
  name: 'molecule-properties',
  components: {
    'molecule-form': MoleculeForm,
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
      this.$nextTick(() => this.$refs.moleculeForm.focus())
    },
    onInput() {
      this.$emit('input', this.modified)
    },
    apply() {
      this.$emit('apply')
    },
    reset() {
      this.modified = this.original
    },
  },
  computed: {
    edited() {
      return !isEqualBy(this.modified, this.original, ['name', 'definition', 'annotation'])
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
