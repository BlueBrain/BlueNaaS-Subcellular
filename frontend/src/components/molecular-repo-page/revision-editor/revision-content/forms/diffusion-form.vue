<template>
  <div>
    <i-form ref="form" :model="diffusion" :label-width="120">
      <FormItem prop="name" label="Name">
        <i-input ref="nameInput" v-model="diffusion.name" @input="onChange" />
      </FormItem>

      <FormItem prop="source" label="Source">
        <i-input disabled :value="diffusion.source" @input="onChange" />
      </FormItem>

      <FormItem prop="definition" label="BNGL expression">
        <bngl-input
          ref="definitionInput"
          size="small"
          entity-type="diffusion"
          v-model="diffusion.definition"
          @tab="onDefinitionInputTab"
          @input="onChange"
        />
      </FormItem>

      <FormItem prop="rate" label="Rate">
        <bngl-input
          ref="rateInput"
          size="small"
          entity-type="parameter"
          v-model="diffusion.rate"
          @tab="onRateInputTab"
          @input="onChange"
        />
      </FormItem>

      <FormItem prop="description" label="Description">
        <i-input
          type="textarea"
          ref="descriptionInput"
          autosize
          v-model="diffusion.description"
          @input="onChange"
        />
      </FormItem>

      <FormItem prop="comments" label="Comments">
        <i-input type="textarea" autosize v-model="diffusion.comments" @input="onChange" />
      </FormItem>
    </i-form>
  </div>
</template>

<script>
import BnglInput from '@/components/shared/bngl-input.vue';

export default {
  name: 'diffusion-form',
  props: ['value'],
  components: {
    'bngl-input': BnglInput,
  },
  data() {
    return {
      diffusion: { ...this.value },
    };
  },
  methods: {
    focus() {
      this.$refs.nameInput.focus();
    },
    refresh() {
      this.$refs.definitionInput.refresh();
      this.$refs.rateInput.refresh();
    },
    onDefinitionInputTab() {
      this.$refs.rateInput.focus();
    },
    onRateInputTab() {
      this.$refs.descriptionInput.focus();
    },
    onChange() {
      // TODO: add validation
      this.diffusion.valid = true;
      this.$emit('input', this.diffusion);
    },
  },
  watch: {
    value() {
      this.diffusion = { ...this.value };
    },
  },
};
</script>
