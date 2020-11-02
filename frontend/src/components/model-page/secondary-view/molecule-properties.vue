<template>
  <div class="p-12">
    <h3>Molecule properties</h3>

    <molecule-form ref="moleculeForm" class="mt-12" v-model="tmpEntity" @on-submit="applyMoleculeChange" />

    <div class="action-block">
      <i-button class="mr-12" type="warning" :disabled="!moleculeEdited" @click="resetMoleculeChange"> Reset </i-button>

      <i-button type="primary" :disabled="!moleculeEdited" @click="applyMoleculeChange"> Apply </i-button>
    </div>
  </div>
</template>

<script>
import isEqualBy from '@/tools/is-equal-by'

import MoleculeForm from '@/components/shared/entities/molecule-form.vue'

export default {
  name: 'molecule-properties',
  components: {
    'molecule-form': MoleculeForm,
  },
  data() {
    return {
      tmpEntity: this.getTmpEntity(),
    }
  },
  mounted() {
    this.focusNameInput()
  },
  methods: {
    focusNameInput() {
      this.$nextTick(() => this.$refs.moleculeForm.focus())
    },
    applyMoleculeChange() {
      this.$store.commit('modifySelectedEntity', this.tmpEntity)
    },
    resetMoleculeChange() {
      this.tmpEntity = this.getTmpEntity()
    },
    getTmpEntity() {
      return Object.assign({}, this.$store.state.selectedEntity.entity)
    },
  },
  computed: {
    moleculeEdited() {
      return !isEqualBy(this.selection.entity, this.tmpEntity, ['name', 'definition', 'annotation'])
    },
    selection() {
      return this.$store.state.selectedEntity
    },
  },
  watch: {
    selection() {
      this.tmpEntity = this.getTmpEntity()
      this.focusNameInput()
    },
  },
}
</script>

<style lang="scss" scoped>
.action-block {
  padding-left: 100px;
}
</style>
