<template>
  <div>
    <i-form ref="form" :model="molecule" :label-width="120">
      <FormItem prop="name" label="Name">
        <i-input ref="nameInput" v-model="molecule.name" @input="onChange" />
      </FormItem>

      <FormItem prop="source" label="Source">
        <i-input disabled :value="molecule.source" @input="onChange" />
      </FormItem>

      <FormItem prop="agentType" label="Agent type">
        <i-select v-model="molecule.agentType" @on-change="onChange">
          <i-option v-for="type in agentType" :key="type" :value="type">
            {{ type }}
          </i-option>
        </i-select>
      </FormItem>

      <FormItem prop="definition" label="BNGL expression">
        <bngl-input
          ref="definitionInput"
          size="small"
          entity-type="molecule"
          v-model="molecule.definition"
          @tab="onDefinitionInputTab"
          @input="onChange"
        />
      </FormItem>

      <FormItem prop="pubChemId" label="PubChem id">
        <i-input v-model="molecule.pubChemId" ref="pubChemInput" @input="onChange" />
      </FormItem>

      <FormItem prop="cid" label="CID">
        <i-input v-model="molecule.cid" @input="onChange" />
      </FormItem>

      <FormItem prop="uniProtId" label="UniProtId">
        <i-input v-model="molecule.uniProtId" @input="onChange" />
      </FormItem>

      <FormItem prop="geneName" label="Gene name">
        <i-input v-model="molecule.geneName" @input="onChange" />
      </FormItem>

      <FormItem prop="description" label="Description">
        <i-input type="textarea" autosize v-model="molecule.description" @input="onChange" />
      </FormItem>

      <FormItem prop="comments" label="Comments">
        <i-input type="textarea" autosize v-model="molecule.comments" @input="onChange" />
      </FormItem>
    </i-form>
  </div>
</template>

<script>
import constants from '@/constants';
import BnglInput from '@/components/shared/bngl-input.vue';

const { agentType } = constants;

export default {
  name: 'molecule-form',
  props: ['value'],
  components: {
    'bngl-input': BnglInput,
  },
  data() {
    return {
      agentType,
      molecule: { ...this.value },
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
      this.$refs.pubChemInput.focus();
    },
    onChange() {
      // TODO: add validation
      this.molecule.valid = true;
      this.$emit('input', this.molecule);
    },
  },
  watch: {
    value() {
      this.molecule = { ...this.value };
    },
  },
};
</script>
