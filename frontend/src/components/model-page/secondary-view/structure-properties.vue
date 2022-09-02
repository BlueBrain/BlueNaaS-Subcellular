<template>
  <div class="p-12">
    <h3>Structure properties</h3>

    <structure-form
      class="mt-12"
      ref="structureForm"
      v-model="modified"
      @on-submit="applyStructureChange"
      @input="onInput"
    />

    <div class="actions-block">
      <i-button
        class="mr-12"
        type="warning"
        :disabled="!structureEdited || isPublicModel"
        @click="resetStructureChange"
      >
        Reset
      </i-button>

      <i-button type="primary" :disabled="!structureEdited || isPublicModel" @click="applyStructureChange">
        Apply
      </i-button>
      <div v-if="error" style="color: red">An error ocurred, try again.</div>
    </div>
  </div>
</template>

<script lang="ts">
import isEqualBy from '@/tools/is-equal-by'

import StructureForm from '@/components/shared/entities/structure-form.vue'
import { PUBLIC_USER_ID } from '@/constants'

export default {
  name: 'structure-properties',
  components: {
    'structure-form': StructureForm,
  },
  props: ['value', 'error'],
  data() {
    return {
      modified: this.value,
      original: this.value,
    }
  },
  mounted() {
    this.focusStructureForm()
  },
  methods: {
    focusStructureForm() {
      this.$nextTick(() => this.$refs.structureForm.focus())
    },
    onInput() {
      this.$emit('input', this.modified)
    },
    applyStructureChange() {
      this.$emit('apply')
    },
    resetStructureChange() {
      this.modified = this.original
    },
  },
  computed: {
    structureEdited() {
      return !isEqualBy(this.modified, this.original, [
        'name',
        'type',
        'parentName',
        'size',
        'annotation',
        'geometryStructureName',
      ])
    },
    isPublicModel() {
      return this.$store.state.model?.user_id === PUBLIC_USER_ID
    },
  },
  watch: {
    value(val, oldVal) {
      console.log('val', val)
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
