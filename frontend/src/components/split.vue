<template>
  <Split v-model="split.rightHorizontal" mode="vertical" min="200px" max="160px" @input="$emit('layoutChange')">
    <div slot="top" class="pl-6">
      <slot name="primary"></slot>
    </div>
    <div slot="bottom" class="pl-6 pt-6 o-auto">
      <slot v-if="this.$store.state.selectedEntity" name="secondary"></slot>
      <div v-else class="h-100 p-12">
        <p>
          Select <span>{{ selectedType }}</span> to view/edit properties
        </p>
      </div>
    </div>
  </Split>
</template>

<script>
export default {
  name: 'split',
  props: {
    selectedType: String,
  },
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
