
<template>
  <i-form
    :label-width="100"
    @submit.native.prevent
  >
    <FormItem
      label="Name *"
    >
      <i-input
        size="small"
        ref="nameInput"
        v-model="molecule.name"
        @input="onMoleculeChange"
      />
    </FormItem>
    <FormItem
      label="BioNetGen def. *"
    >
      <bngl-input
        ref="definitionInput"
        size="small"
        entity-type="molecule"
        v-model="molecule.definition"
        @tab="onDefinitionInputTab"
        @input="onMoleculeChange"
      />
    </FormItem>
    <FormItem label="Annotation">
      <i-input
        ref="annotationInput"
        size="small"
        type="textarea"
        autosize
        v-model="molecule.annotation"
        @input="onMoleculeChange"
      />
    </FormItem>
  </i-form>
</template>


<script>
  import constants from '@/constants';

  import BnglInput from '@/components/shared/bngl-input.vue';


  export default {
    name: 'molecule-form',
    props: ['value'],
    components: {
      'bngl-input': BnglInput,
    },
    data() {
      return {
        constants,
        molecule: Object.assign({}, this.value),
      };
    },
    methods: {
      onMoleculeChange() {
        this.molecule.valid = this.isValid();
        this.$emit('input', this.molecule);
      },
      isValid() {
        return this.molecule.name && this.molecule.definition;
      },
      onDefinitionInputTab() {
        this.$refs.annotationInput.focus();
      },
      focus() {
        this.$refs.nameInput.focus();
      },
      refresh() {
        this.$refs.definitionInput.refresh();
      },
    },
    watch: {
      value() {
        this.molecule = Object.assign({}, this.value);
      },
    },
  };
</script>
