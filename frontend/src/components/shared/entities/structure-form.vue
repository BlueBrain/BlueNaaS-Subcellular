<template>
  <i-form :label-width="130" @submit.native.prevent>
    <FormItem label="Name *">
      <i-input size="small" ref="nameInput" v-model="structure.name" @input="onNameChange" />
    </FormItem>

    <FormItem label="Type *">
      <i-select v-model="structure.type" @input="onStructureChange">
        <i-option
          v-for="entityType in constants.StructureType"
          :value="entityType"
          :key="entityType"
        >
          {{ entityType }}
        </i-option>
      </i-select>
    </FormItem>

    <FormItem label="Parent">
      <i-select v-model="structure.parentName" @input="onStructureChange">
        <i-option value="-">none</i-option>
        <i-option v-for="name in parentStructureNames" :value="name" :key="name">{{
          name
        }}</i-option>
      </i-select>
    </FormItem>

    <FormItem v-if="geometry" label="Geometry structure *">
      <i-select v-model="structure.geometryStructureName" @input="onStructureChange">
        <i-option v-for="name in geometryStructureNames" :value="name" :key="name">{{
          name
        }}</i-option>
      </i-select>
    </FormItem>

    <FormItem label="Size">
      <bngl-input
        ref="sizeInput"
        size="small"
        entity-type="parameter"
        v-model="structure.size"
        :read-only="geometry"
        :border="true"
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
  import get from 'lodash/get';

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
        structure: { ...this.value },
      };
    },
    methods: {
      onNameChange(name) {
        if (this.geometry) {
          const geomStruct = this.geometry.structures.find((struct) => struct.name === name);

          if (geomStruct) {
            this.structure.size = geomStruct.size.toPrecision(5);
          }
        }

        this.onStructureChange();
      },
      onStructureChange() {
        this.structure.valid = this.isValid();
        this.$emit('input', this.structure);
      },
      isValid() {
        return this.structure.name.trim();
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
          .filter((s) => s.name !== this.structure.name)
          .map((s) => s.name);
      },
      geometryStructureNames() {
        if (!this.geometry) return [];

        return this.geometry.meta.structures.map((structure) => structure.name);
      },
      isRootStructurePresent() {
        return this.$store.state.model.structures.some((s) => s.parentName === '-');
      },
      geometry() {
        return get(this.$store.state, 'model.geometry');
      },
    },
    watch: {
      value() {
        this.structure = { ...this.value };
      },
    },
  };
</script>
