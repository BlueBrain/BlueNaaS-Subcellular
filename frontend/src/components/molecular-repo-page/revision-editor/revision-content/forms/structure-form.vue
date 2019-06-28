
<template>
  <div>
    <i-form
      ref="form"
      :model="structure"
      :label-width="120"
    >
      <FormItem
        prop="name"
        label="Name"
      >
        <i-input
          ref="nameInput"
          v-model="structure.name"
          @input="onChange"
        />
      </FormItem>

      <FormItem
        prop="source"
        label="Source"
      >
        <i-input
          disabled
          :value="structure.source"
          @input="onChange"
        />
      </FormItem>

      <FormItem
        prop="type"
        label="Type"
      >
        <i-select
          v-model="structure.type"
          @on-change="onChange"
        >
          <i-option value="compartment">compartment</i-option>
          <i-option value="membrane">membrane</i-option>
        </i-select>
      </FormItem>

      <FormItem
        prop="uniProtId"
        label="UniProtId"
      >
        <i-input
          v-model="structure.uniProtId"
          @input="onChange"
        />
      </FormItem>

      <FormItem
        prop="goId"
        label="GoId"
      >
        <i-input
          v-model="structure.goId"
          @input="onChange"
        />
      </FormItem>

      <FormItem
        prop="description"
        label="Description"
      >
        <i-input
          type="textarea"
          autosize
          v-model="structure.description"
          @input="onChange"
        />
      </FormItem>
    </i-form>
  </div>
</template>


<script>
  export default {
    name: 'structure-form',
    props: ['value'],
    data() {
      return {
        structure: Object.assign({}, this.value),
      };
    },
    methods: {
      focus() {
        this.$refs.nameInput.focus();
      },
      onChange() {
        // TODO: add validation
        this.structure.valid = true;
        this.$emit('input', this.structure);
      },
    },
    watch: {
      value() {
        this.structure = Object.assign({}, this.value);
      },
    },
  };
</script>
