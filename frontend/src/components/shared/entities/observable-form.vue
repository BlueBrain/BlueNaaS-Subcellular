<template>
  <i-form :label-width="120" @submit.native.prevent>
    <FormItem label="Name *">
      <i-input size="small" ref="nameInput" v-model="observable.name" @input="onObservableChange" />
    </FormItem>
    <FormItem label="BioNetGen def. *">
      <bngl-input
        ref="definitionInput"
        size="small"
        entity-type="observable"
        v-model="observable.definition"
        @tab="onDefinitionInputTab"
        @input="onObservableChange"
      />
    </FormItem>
    <FormItem label="Annotation">
      <i-input
        ref="annotationInput"
        size="small"
        type="textarea"
        autosize
        v-model="observable.annotation"
        @input="onObservableChange"
      />
    </FormItem>
  </i-form>
</template>

<script>
import BnglInput from '@/components/shared/bngl-input.vue';

export default {
  name: 'observable-form',
  props: ['value'],
  components: {
    'bngl-input': BnglInput,
  },
  data() {
    return {
      observable: { ...this.value },
    };
  },
  methods: {
    onObservableChange() {
      this.observable.valid = this.isValid();
      this.$emit('input', this.observable);
    },
    isValid() {
      return this.observable.name.trim() && this.observable.definition;
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
      this.observable = { ...this.value };
    },
  },
};
</script>
