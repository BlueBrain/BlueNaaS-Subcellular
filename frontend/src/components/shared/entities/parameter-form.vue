
<template>
  <i-form
    :label-width="110"
    @submit.native.prevent="onSubmit"
  >
    <FormItem
      label="Name *"
    >
      <i-input
        size="small"
        ref="nameInput"
        v-model="parameter.name"
        @input="onParameterChange"
      />
    </FormItem>
    <FormItem
      label="BioNetGen def. *"
    >
      <bngl-input
        ref="definitionInput"
        size="small"
        entity-type="parameter"
        v-model="parameter.definition"
        @enter="onSubmit"
        @tab="onDefinitionInputTab"
        @input="onParameterChange"
      />
    </FormItem>
    <FormItem label="Unit *">
      <unit-select
        ref="unitSelect"
        v-model="parameter.unit"
        @input="onParameterChange"
      />
    </FormItem>
    <FormItem label="Annotation">
      <i-input
        size="small"
        type="textarea"
        autosize
        v-model="parameter.annotation"
        @input="onParameterChange"
      />
    </FormItem>
  </i-form>
</template>


<script>
  import constants from '@/constants';

  import BnglInput from '@/components/shared/bngl-input.vue';
  import UnitSelect from '@/components/shared/unit-select.vue';


  export default {
    name: 'parameter-form',
    props: ['value'],
    components: {
      'bngl-input': BnglInput,
      'unit-select': UnitSelect,
    },
    data() {
      return {
        constants,
        parameter: Object.assign({}, this.value),
      };
    },
    methods: {
      onParameterChange() {
        this.parameter.valid = this.isValid();
        this.$emit('input', this.parameter);
      },
      isValid() {
        return this.parameter.name && this.parameter.definition && this.parameter.unit;
      },
      onDefinitionInputTab() {
        this.$refs.unitSelect.focus();
      },
      onSubmit() {
        this.$emit('on-submit');
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
        this.parameter = Object.assign({}, this.value);
      },
    },
  };
</script>
