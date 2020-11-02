<template>
  <i-form :label-width="120" @submit.native.prevent>
    <FormItem label="Name *">
      <i-input size="small" ref="nameInput" v-model="species.name" @input="onSpeciesChange" />
    </FormItem>
    <FormItem label="BioNetGen def. *">
      <bngl-input
        ref="definitionInput"
        size="small"
        entity-type="species"
        v-model="species.definition"
        @tab="onDefinitionInputTab"
        @input="onSpeciesChange"
      />
    </FormItem>
    <FormItem label="Concentration *">
      <bngl-input
        ref="concentrationInput"
        size="small"
        entity-type="parameter"
        v-model="species.concentration"
        @tab="onConcentrationInputTab"
        @input="onSpeciesChange"
      />
    </FormItem>
    <FormItem label="Annotation">
      <i-input
        ref="annotationInput"
        size="small"
        type="textarea"
        autosize
        v-model="species.annotation"
        @input="onSpeciesChange"
      />
    </FormItem>
  </i-form>
</template>

<script>
  import constants from '@/constants';

  import BnglInput from '@/components/shared/bngl-input.vue';

  export default {
    name: 'species-form',
    props: ['value'],
    components: {
      'bngl-input': BnglInput,
    },
    data() {
      return {
        constants,
        species: { ...this.value },
      };
    },
    methods: {
      onSpeciesChange() {
        this.species.valid = this.isValid();
        this.$emit('input', this.species);
      },
      isValid() {
        return this.species.name.trim() && this.species.definition && this.species.concentration;
      },
      onDefinitionInputTab() {
        this.$refs.concentrationInput.focus();
      },
      onConcentrationInputTab() {
        this.$refs.annotationInput.focus();
      },
      focus() {
        this.$refs.nameInput.focus();
      },
      refresh() {
        this.$refs.definitionInput.refresh();
        this.$refs.concentrationInput.refresh();
      },
    },
    watch: {
      value() {
        this.species = { ...this.value };
      },
    },
  };
</script>
