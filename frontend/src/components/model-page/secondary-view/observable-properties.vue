<template>
  <div class="p-12">
    <h3>Observable properties</h3>

    <observable-form class="mt-12" ref="observableForm" v-model="modified" @on-submit="apply" @input="onInput" />

    <div class="action-block">
      <i-button class="mr-12" type="warning" :disabled="!observableEdited" @click="reset"> Reset </i-button>

      <i-button type="primary" :disabled="!observableEdited" @click="apply"> Apply </i-button>
      <div v-if="error" style="color: red">An error ocurred, try again.</div>
    </div>
  </div>
</template>

<script lang="ts">
import isEqualBy from '@/tools/is-equal-by'

import ObservableForm from '@/components/shared/entities/observable-form.vue'

export default {
  name: 'observable-properties',
  props: ['value', 'error'],
  components: {
    'observable-form': ObservableForm,
  },
  data() {
    return {
      modified: this.value,
      original: this.value,
    }
  },
  mounted() {
    this.focusObservableForm()
  },
  methods: {
    focusObservableForm() {
      this.$nextTick(() => this.$refs.observableForm.focus())
    },

    onInput() {
      this.$emit('input', this.modified)
    },
    reset() {
      this.modified = this.original
    },
    apply() {
      this.$emit('apply')
    },
  },
  computed: {
    observableEdited() {
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
