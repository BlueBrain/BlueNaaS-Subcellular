<template>
  <Split v-model="split.rightHorizontal" mode="vertical" min="200px" max="160px" @input="$emit('layoutChange')">
    <div slot="top" class="pl-6">
      <slot name="primary"></slot>
    </div>
    <div slot="bottom" class="pl-6 pt-6 o-auto">
      <slot name="secondary"></slot>
    </div>
  </Split>
</template>

<script lang="ts">
export default {
  name: 'split',
  data() {
    return {
      split: {
        vertical: 0.2,
        leftHorizontal: 0.5,
        rightHorizontal: 0.5,
      },
    }
  },
}
</script>

<style lang="scss" scoped>
.ivu-split-pane > div {
  height: 100%;
}
</style>
