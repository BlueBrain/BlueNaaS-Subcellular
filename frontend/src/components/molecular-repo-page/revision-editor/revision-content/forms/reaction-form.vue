<template>
  <div>
    <i-form ref="form" :model="reaction" :label-width="120">
      <FormItem prop="name" label="Name">
        <i-input ref="nameInput" v-model="reaction.name" @input="onChange" />
      </FormItem>

      <FormItem prop="source" label="Source">
        <i-input disabled :value="reaction.source" @input="onChange" />
      </FormItem>

      <FormItem prop="definition" label="BNGL expression">
        <bngl-input
          ref="definitionInput"
          size="small"
          entity-type="reaction"
          v-model="reaction.definition"
          @tab="onDefinitionInputTab"
          @input="onChange"
        />
      </FormItem>

      <FormItem prop="kf" label="Kf">
        <bngl-input
          ref="kfInput"
          size="small"
          entity-type="parameter"
          v-model="reaction.kf"
          @tab="onKfInputTab"
          @input="onChange"
        />
      </FormItem>

      <FormItem prop="kr" label="Kr">
        <bngl-input
          ref="krInput"
          size="small"
          entity-type="parameter"
          v-model="reaction.kr"
          @tab="onKrInputTab"
          @input="onChange"
        />
      </FormItem>

      <FormItem prop="description" label="Description">
        <i-input
          type="textarea"
          ref="descriptionInput"
          autosize
          v-model="reaction.description"
          @input="onChange"
        />
      </FormItem>

      <FormItem prop="comments" label="Comments">
        <i-input type="textarea" autosize v-model="reaction.comments" @input="onChange" />
      </FormItem>
    </i-form>
  </div>
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
    focus() {
      this.$refs.nameInput.focus();
    },
    refresh() {
      this.$refs.definitionInput.refresh();
      this.$refs.kfInput.refresh();
      this.$refs.krInput.refresh();
    },
    onDefinitionInputTab() {
      this.$refs.kfInput.focus();
    },
    onKfInputTab() {
      this.$refs.krInput.focus();
    },
    onKrInputTab() {
      this.$refs.descriptionInput.focus();
    },
    onChange() {
      // TODO: add validation
      this.reaction.valid = true;
      this.$emit('input', this.reaction);
    },
  },
  watch: {
    value() {
      this.reaction = { ...this.value };
    },
  },
};
</script>
