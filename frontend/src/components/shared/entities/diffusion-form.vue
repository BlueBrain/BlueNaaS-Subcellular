<template>
  <i-form :label-width="120" @submit.native.prevent="onSubmit">
    <FormItem label="Name *">
      <i-input ref="nameInput" v-model="diffusion.name" @input="onDiffusionChange" />
    </FormItem>
    <FormItem label="Compartment *">
      <i-select v-model="diffusion.compartment" @on-change="onDiffusionChange">
        <i-option v-for="structure in structures" :key="structure.name" :value="structure.name">
          {{ structure.name }}
        </i-option>
      </i-select>
    </FormItem>
    <FormItem label="Species BNG def. *">
      <bngl-input
        ref="speciesDefinitionInput"
        entity-type="diffusion"
        v-model="diffusion.speciesDefinition"
        @enter="onSubmit"
        @tab="onSpeciesDefinitionInputTab"
        @input="onDiffusionChange"
      />
    </FormItem>
    <FormItem label="Diffusion constant *">
      <bngl-input
        ref="diffusionConstantInput"
        entity-type="parameter"
        v-model="diffusion.diffusionConstant"
        @enter="onSubmit"
        @tab="onDiffusionConstantInputTab"
        @input="onDiffusionChange"
      />
    </FormItem>
    <FormItem label="Annotation">
      <i-input
        ref="annotationInput"
        type="textarea"
        autosize
        v-model="diffusion.annotation"
        @input="onDiffusionChange"
      />
    </FormItem>
  </i-form>
</template>

<script>
import constants from '@/constants'

import BnglInput from '@/components/shared/bngl-input.vue'

export default {
  name: 'diffusion-form',
  props: ['value'],
  components: {
    'bngl-input': BnglInput,
  },
  data() {
    return {
      constants,
      diffusion: Object.assign({}, this.value),
    }
  },
  methods: {
    onDiffusionChange() {
      this.diffusion.valid = this.isValid()
      this.$emit('input', this.diffusion)
    },
    isValid() {
      return this.diffusion.name.trim() && this.diffusion.speciesDefinition
    },
    onSpeciesDefinitionInputTab() {
      this.$refs.diffusionConstantInput.focus()
    },
    onDiffusionConstantInputTab() {
      this.$refs.annotationInput.focus()
    },
    onSubmit() {
      this.$emit('on-submit')
    },
    focus() {
      this.$refs.nameInput.focus()
    },
    refresh() {
      this.$refs.speciesDefinitionInput.refresh()
      this.$refs.diffusionConstantInput.refresh()
    },
  },
  computed: {
    structures() {
      return this.$store.state.model.structures
    },
  },
  watch: {
    value() {
      this.diffusion = Object.assign({}, this.value)
    },
  },
}
</script>
