
<template>
  <div>
    <i-form
      ref="form"
      :model="parameter"
      :label-width="120"
    >

      <FormItem
        prop="name"
        label="Name"
      >
        <i-input
          ref="nameInput"
          v-model="parameter.name"
          @input="onChange"
        />
      </FormItem>

      <FormItem
        prop="source"
        label="Source"
      >
        <i-input
          disabled
          :value="parameter.source"
          @input="onChange"
        />
      </FormItem>

      <FormItem
        prop="definition"
        label="BNGL expression"
      >
        <bngl-input
          ref="definitionInput"
          size="small"
          entity-type="parameter"
          v-model="parameter.definition"
          @tab="onDefinitionInputTab"
          @input="onChange"
        />
      </FormItem>

      <FormItem
        prop="description"
        label="Description"
      >
        <i-input
          type="textarea"
          ref="descriptionInput"
          autosize
          v-model="parameter.description"
          @input="onChange"
        />
      </FormItem>

      <FormItem
        prop="comments"
        label="Comments"
      >
        <i-input
          type="textarea"
          autosize
          v-model="parameter.comments"
          @input="onChange"
        />
      </FormItem>
    </i-form>
  </div>
</template>


<script>
  import BnglInput from '@/components/shared/bngl-input.vue';

  export default {
    name: 'parameter-form',
    props: ['value'],
    components: {
      'bngl-input': BnglInput,
    },
    data() {
      return {
        parameter: Object.assign({}, this.value),
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
        this.parameter.valid = true;
        this.$emit('input', this.parameter);
      },
    },
    watch: {
      value() {
        this.parameter = Object.assign({}, this.value);
      },
    },
  };
</script>
