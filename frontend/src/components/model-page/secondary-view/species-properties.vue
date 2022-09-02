<template>
  <div class="p-12">
    <h3>Species properties</h3>

    <species-form class="mt-12" ref="speciesForm" v-model="modified" @on-submit="apply" @input="onInput" />

    <div class="action-block">
      <i-button class="mr-12" type="warning" :disabled="!edited" @click="reset"> Reset </i-button>

      <i-button type="primary" :disabled="!edited" @click="apply"> Apply </i-button>
      <div v-if="error" style="color: red">An error ocurred, try again.</div>
    </div>
  </div>
</template>

<script lang="ts">
import isEqualBy from '@/tools/is-equal-by'

import SpeciesForm from '@/components/shared/entities/species-form.vue'

export default {
  name: 'species-properties',
  components: {
    'species-form': SpeciesForm,
  },
  props: ['value', 'error'],
  data() {
    return {
      modified: this.value,
      original: this.value,
    }
  },
  mounted() {
    this.focusForm()
  },
  methods: {
    focusForm() {
      this.$nextTick(() => this.$refs.speciesForm.focus())
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
      return !isEqualBy(this.modified, this.original, ['name', 'definition', 'concentration', 'annotation'])
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
