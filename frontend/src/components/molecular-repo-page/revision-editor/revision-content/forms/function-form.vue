<template>
  <div>
    <i-form ref="form" :model="func" :label-width="120">
      <FormItem prop="name" label="Name">
        <i-input ref="nameInput" v-model="func.name" @input="onChange" />
      </FormItem>

      <FormItem prop="source" label="Source">
        <i-input disabled :value="func.source" @input="onChange" />
      </FormItem>

      <FormItem prop="definition" label="BNGL expression">
        <bngl-input
          ref="definitionInput"
          size="small"
          entity-type="function"
          v-model="func.definition"
          @tab="onDefinitionInputTab"
          @input="onChange"
        />
      </FormItem>

      <FormItem prop="description" label="Description">
        <i-input
          type="textarea"
          ref="descriptionInput"
          autosize
          v-model="func.description"
          @input="onChange"
        />
      </FormItem>

      <FormItem prop="comments" label="Comments">
        <i-input type="textarea" autosize v-model="func.comments" @input="onChange" />
      </FormItem>
    </i-form>
  </div>
</template>

<script>
  import BnglInput from '@/components/shared/bngl-input.vue';

  export default {
    name: 'function-form',
    props: ['value'],
    components: {
      'bngl-input': BnglInput,
    },
    data() {
      return {
        func: { ...this.value },
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
        this.$refs.descriptionInput.focus();
      },
      onChange() {
        // TODO: add validation
        this.func.valid = true;
        this.$emit('input', this.func);
      },
    },
    watch: {
      value() {
        this.func = { ...this.value };
      },
    },
  };
</script>
