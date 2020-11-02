<template>
  <i-form :label-width="120" @submit.native.prevent>
    <FormItem label="Name *">
      <i-input size="small" ref="nameInput" v-model="reaction.name" @input="onReactionChange" />
    </FormItem>
    <FormItem label="BioNetGen def. *">
      <bngl-input
        ref="definitionInput"
        size="small"
        entity-type="reaction"
        v-model="reaction.definition"
        @tab="onDefinitionInputTab"
        @input="onReactionChange"
      />
    </FormItem>
    <FormItem label="kf *">
      <bngl-input
        ref="kfInput"
        entity-type="parameter"
        v-model="reaction.kf"
        @tab="onKfInputTab"
        @input="onReactionChange"
      />
    </FormItem>
    <FormItem label="kr">
      <bngl-input
        ref="krInput"
        entity-type="parameter"
        v-model="reaction.kr"
        @tab="onKrInputTab"
        @input="onReactionChange"
      />
    </FormItem>
    <FormItem label="Annotation">
      <i-input
        ref="annotationInput"
        type="textarea"
        v-model="reaction.annotation"
        @input="onReactionChange"
      />
    </FormItem>
  </i-form>
</template>

<script>
  import BnglInput from '@/components/shared/bngl-input.vue';

  export default {
    name: 'reaction-form',
    props: ['value'],
    components: {
      'bngl-input': BnglInput,
    },
    data() {
      return {
        reaction: { ...this.value },
      };
    },
    methods: {
      onReactionChange() {
        this.reaction.valid = this.isValid();
        this.$emit('input', this.reaction);
      },
      isValid() {
        // TODO: add reaction validation
        // TODO: add kr validation if reaction is bidirectional
        return this.reaction.name.trim() && this.reaction.definition && this.reaction.kf;
      },
      onDefinitionInputTab() {
        this.$refs.kfInput.focus();
      },
      onKfInputTab() {
        this.$refs.krInput.focus();
      },
      onKrInputTab() {
        this.$refs.annotationInput.focus();
      },
      focus() {
        this.$refs.nameInput.focus();
      },
      refresh() {
        this.$refs.definitionInput.refresh();
        this.$refs.kfInput.refresh();
        this.$refs.krInput.refresh();
      },
    },
    watch: {
      value() {
        this.reaction = { ...this.value };
      },
    },
  };
</script>
