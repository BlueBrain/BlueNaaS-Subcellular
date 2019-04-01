
<template>
  <i-form
    :label-width="100"
    @submit.native.prevent
  >
    <FormItem
      label="Name *"
    >
      <i-input
        size="small"
        ref="nameInput"
        v-model="structure.name"
        @input="onStructureChange"
      />
    </FormItem>

    <FormItem
      label="Type *"
    >
      <i-select
        v-model="structure.type"
        @input="onStructureChange"
      >
        <i-option
          v-for="entityType in constants.StructureType"
          :value="entityType"
          :key="entityType"
        >
          {{ entityType }}
        </i-option>
      </i-select>
    </FormItem>

    <FormItem
      label="Parent"
    >
      <i-select
        v-model="structure.parentName"
        @input="onStructureChange"
      >
        <i-option
          v-if="!isRootStructurePresent || nonBnglStructures"
          value="-"
        >
          none
        </i-option>
        <i-option
          v-for="name in parentStructureNames"
          :value="name"
          :key="name"
        >
          {{ name }}
        </i-option>
      </i-select>
    </FormItem>

    <FormItem
      label="Size"
    >
      <bngl-input
        ref="sizeInput"
        size="small"
        entity-type="parameter"
        v-model="structure.size"
        @tab="onSizeInputTab"
        @input="onStructureChange"
      />
    </FormItem>

    <FormItem label="Annotation">
      <i-input
        ref="annotationInput"
        size="small"
        type="textarea"
        autosize
        v-model="structure.annotation"
        @input="onStructureChange"
      />
    </FormItem>
  </i-form>
</template>


<script>
  import constants from '@/constants';

  import BnglInput from '@/components/shared/bngl-input.vue';


  export default {
    name: 'structure-form',
    props: ['value'],
    components: {
      'bngl-input': BnglInput,
    },
    data() {
      return {
        constants,
        structure: Object.assign({}, this.value),
      };
    },
    methods: {
      onStructureChange() {
        this.structure.valid = this.isValid();
        this.$emit('input', this.structure);
      },
      isValid() {
        return this.structure.name.trim() && (this.nonBnglStructures || this.structure.parentName);
      },
      onSizeInputTab() {
        this.$refs.annotationInput.focus();
      },
      focus() {
        this.$refs.nameInput.focus();
      },
      refresh() {
        this.$refs.sizeInput.refresh();
      },
    },
    computed: {
      // TODO: filter available parent structures according to BNGL rules
      parentStructureNames() {
        return this.$store.state.model.structures
          .filter(s => s.name !== this.structure.name)
          .map(s => s.name);
      },
      isRootStructurePresent() {
        return this.$store.state.model.structures.some(s => s.parentName === '-');
      },
      nonBnglStructures() {
        return this.$store.state.model.nonBnglStructures;
      },
    },
    watch: {
      value() {
        this.structure = Object.assign({}, this.value);
      },
    },
  };
</script>
