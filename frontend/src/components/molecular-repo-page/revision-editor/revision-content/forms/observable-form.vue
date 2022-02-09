<template>
  <div>
    <i-form ref="form" :model="observable" :label-width="120">
      <FormItem prop="name" label="Name">
        <i-input ref="nameInput" v-model="observable.name" @input="onChange" />
      </FormItem>

      <FormItem prop="source" label="Source">
        <i-input disabled :value="observable.source" @input="onChange" />
      </FormItem>

      <FormItem prop="definition" label="BNGL expression">
        <bngl-input
          ref="definitionInput"
          size="small"
          entity-type="observable"
          v-model="observable.definition"
          @tab="onDefinitionInputTab"
          @input="onChange"
        />
      </FormItem>

      <FormItem prop="comments" label="Comments">
        <i-input
          type="textarea"
          ref="commentsInput"
          autosize
          v-model="observable.comments"
          @input="onChange"
        />
      </FormItem>
    </i-form>
  </div>
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
    focus() {
      this.$refs.nameInput.focus();
    },
    refresh() {
      this.$refs.definitionInput.refresh();
    },
    onDefinitionInputTab() {
      this.$refs.commentsInput.focus();
    },
    onChange() {
      // TODO: add validation
      this.observable.valid = true;
      this.$emit('input', this.observable);
    },
  },
  watch: {
    value() {
      this.observable = { ...this.value };
    },
  },
};
</script>
