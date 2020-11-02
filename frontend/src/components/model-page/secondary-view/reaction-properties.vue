<template>
  <div class="p-12">
    <h3>Reaction properties</h3>

    <reaction-form class="mt-12" ref="reactionForm" v-model="tmpEntity" @on-submit="applyReactionChange" />

    <div class="action-block">
      <i-button class="mr-12" type="warning" :disabled="!reactionEdited" @click="resetReactionChange"> Reset </i-button>

      <i-button type="primary" :disabled="!reactionEdited" @click="applyReactionChange"> Apply </i-button>
    </div>
  </div>
</template>

<script>
import isEqualBy from '@/tools/is-equal-by'

import ReactionForm from '@/components/shared/entities/reaction-form.vue'

export default {
  name: 'reaction-properties',
  components: {
    'reaction-form': ReactionForm,
  },
  data() {
    return {
      tmpEntity: this.getTmpEntity(),
    }
  },
  mounted() {
    this.focusReactionForm()
  },
  methods: {
    focusReactionForm() {
      this.$nextTick(() => this.$refs.reactionForm.focus())
    },
    applyReactionChange() {
      this.$store.commit('modifySelectedEntity', this.tmpEntity)
    },
    resetReactionChange() {
      this.tmpEntity = this.getTmpEntity()
    },
    getTmpEntity() {
      return Object.assign({}, this.$store.state.selectedEntity.entity)
    },
  },
  computed: {
    reactionEdited() {
      return !isEqualBy(this.selection.entity, this.tmpEntity, ['name', 'definition', 'kr', 'kf', 'annotation'])
    },
    selection() {
      return this.$store.state.selectedEntity
    },
  },
  watch: {
    selection() {
      this.tmpEntity = this.getTmpEntity()
      this.focusReactionForm()
    },
  },
}
</script>

<style lang="scss" scoped>
.action-block {
  padding-left: 100px;
}
</style>
