<template>
  <div class="p-12">
    <h3>Reaction properties</h3>

    <reaction-form class="mt-12" ref="reactionForm" v-model="modified" @on-submit="apply" @input="onInput" />

    <div class="action-block">
      <i-button class="mr-12" type="warning" :disabled="!reactionEdited" @click="reset"> Reset </i-button>

      <i-button type="primary" :disabled="!reactionEdited" @click="apply"> Apply </i-button>
      <div v-if="error" style="color: red">An error ocurred, try again.</div>
    </div>
  </div>
</template>

<script lang="ts">
import isEqualBy from '@/tools/is-equal-by'

import ReactionForm from '@/components/shared/entities/reaction-form.vue'

export default {
  name: 'reaction-properties',
  components: {
    'reaction-form': ReactionForm,
  },
  props: ['value', 'error'],
  data() {
    return {
      modified: this.value,
      original: this.value,
    }
  },
  mounted() {
    this.focusReactionForm()
  },
  methods: {
    focusReactionForm() {
      this.$nextTick(() => this.$refs.reactionForm.focus())
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
    reactionEdited() {
      return !isEqualBy(this.modified, this.original, ['name', 'definition', 'kr', 'kf', 'annotation'])
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
