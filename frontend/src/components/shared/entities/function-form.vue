
<template>
  <i-form
    :label-width="120"
    @submit.native.prevent
  >
    <FormItem
      label="Name *"
    >
      <i-input
        size="small"
        ref="nameInput"
        v-model="func.name"
        @input="onFunctionChange"
      />
    </FormItem>
    <FormItem
      label="Argument"
    >
      <i-input
        size="small"
        v-model="func.argument"
        @input="onFunctionChange"
      />
    </FormItem>
    <FormItem
      label="BioNetGen def. *"
    >
      <bngl-input
        ref="definitionInput"
        size="small"
        entity-type="function"
        v-model="func.definition"
        @tab="onDefinitionInputTab"
        @input="onFunctionChange"
      />
    </FormItem>
    <FormItem label="Annotation">
      <i-input
        ref="annotationInput"
        size="small"
        type="textarea"
        autosize
        v-model="func.annotation"
        @input="onFunctionChange"
      />
    </FormItem>
  </i-form>
</template>


<script>
  import constants from '@/constants';

  import BnglInput from '@/components/shared/bngl-input.vue';


  export default {
    name: 'function-form',
    props: ['value'],
    components: {
      'bngl-input': BnglInput,
    },
    data() {
      return {
        constants,
        func: Object.assign({}, this.value),
      };
    },
    methods: {
      onFunctionChange() {
        this.func.valid = this.isValid();
        this.$emit('input', this.func);
      },
      isValid() {
        return this.func.name.trim() && this.func.definition;
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
        this.func = Object.assign({}, this.value);
      },
    },
  };
</script>
