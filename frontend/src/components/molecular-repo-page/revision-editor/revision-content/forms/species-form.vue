
<template>
  <div>
    <i-form
      ref="form"
      :model="species"
      :label-width="120"
    >

      <FormItem
        prop="name"
        label="Name"
      >
        <i-input
          ref="nameInput"
          v-model="species.name"
          @input="onChange"
        />
      </FormItem>

      <FormItem
        prop="source"
        label="Source"
      >
        <i-input
          disabled
          :value="species.source"
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
          entity-type="species"
          v-model="species.definition"
          @tab="onDefinitionInputTab"
          @input="onChange"
        />
      </FormItem>

      <FormItem
        prop="concentration"
        label="Concentration"
      >
        <bngl-input
          ref="concInput"
          size="small"
          entity-type="parameter"
          v-model="species.concentration"
          @tab="onConcentrationInputTab"
          @input="onChange"
        />
      </FormItem>

      <FormItem
        prop="units"
        label="Units"
      >
        <i-input
          v-model="species.units"
          ref="unitsInput"
          @input="onChange"
        />
      </FormItem>
    </i-form>
  </div>
</template>


<script>
  import constants from '@/constants';
  import BnglInput from '@/components/shared/bngl-input.vue';

  const { agentType } = constants;

  export default {
    name: 'species-form',
    props: ['value'],
    components: {
      'bngl-input': BnglInput,
    },
    data() {
      return {
        agentType,
        species: Object.assign({}, this.value),
      };
    },
    methods: {
      focus() {
        this.$refs.nameInput.focus();
      },
      refresh() {
        this.$refs.definitionInput.refresh();
        this.$refs.concInput.refresh();
      },
      onDefinitionInputTab() {
        this.$refs.concInput.focus();
      },
      onConcentrationInputTab() {
        this.$refs.unitsInput.focus();
      },
      onChange() {
        // TODO: add validation
        this.species.valid = true;
        this.$emit('input', this.species);
      },
    },
    watch: {
      value() {
        this.species = Object.assign({}, this.value);
      },
    },
  };
</script>
