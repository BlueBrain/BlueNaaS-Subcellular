<template>
  <div>
    <i-form ref="form" :model="species" :label-width="120">
      <FormItem prop="name" label="Name">
        <i-input ref="nameInput" v-model="species.name" @input="onChange" />
      </FormItem>

      <FormItem prop="source" label="Source">
        <i-input disabled :value="species.source" @input="onChange" />
      </FormItem>

      <FormItem prop="definition" label="BNGL expression">
        <bngl-input
          ref="definitionInput"
          size="small"
          entity-type="species"
          v-model="species.definition"
          @tab="onDefinitionInputTab"
          @input="onChange"
        />
      </FormItem>

      <FormItem v-if="hasOnlyDefaultConcentration" prop="concentration" label="Concentration">
        <bngl-input
          ref="concInput0"
          size="small"
          entity-type="parameter"
          v-model="species.concentration.default"
          @tab="onConcentrationInputTab(0)"
          @input="onChange"
        />
      </FormItem>

      <div v-else>
        <Divider />
        <h3 class="mb-24">Concentrations</h3>
        <FormItem
          v-for="(concSource, sourceIndex) in concSources"
          :key="concSource"
          :label="concSource"
        >
          <bngl-input
            :ref="`concInput${sourceIndex}`"
            size="small"
            entity-type="parameter"
            v-model="species.concentration[concSource]"
            @tab="onConcentrationInputTab(sourceIndex)"
            @input="onChange"
          />
        </FormItem>
        <Divider />
      </div>

      <FormItem prop="units" label="Units">
        <i-input v-model="species.units" ref="unitsInput" @input="onChange" />
      </FormItem>
    </i-form>
  </div>
</template>

<script>
import get from 'lodash/get';

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
      species: { ...this.value },
    };
  },
  methods: {
    focus() {
      this.$refs.nameInput.focus();
    },
    refresh() {
      this.$refs.definitionInput.refresh();
      Object.keys(this.$refs)
        .filter((refName) => refName.includes('concInput'))
        .forEach((refName) => {
          // TODO: refactor
          const refs = this.$refs[refName];
          const ref = refs.length ? refs[0] : refs;
          if (ref.refresh) ref.refresh();
        });
    },
    onDefinitionInputTab() {
      const input0refs = this.$refs.concInput0;
      const ref = input0refs.length ? input0refs[0] : input0refs;
      if (ref.focus) ref.focus();
    },
    onConcentrationInputTab(concInputIndex) {
      const nextConcInputRefList = this.$refs[`concInput${concInputIndex + 1}`];
      if (nextConcInputRefList) {
        nextConcInputRefList[0].focus();
      } else {
        this.$refs.unitsInput.focus();
      }
    },
    onChange() {
      // TODO: add validation
      this.species.valid = true;
      this.$emit('input', this.species);
    },
  },
  computed: {
    hasOnlyDefaultConcentration() {
      return this.concSources.length === 1 && this.concSources[0] === 'default';
    },
    concSources() {
      const concentration = get(this.species, 'concentration', {});
      return Object.keys(concentration);
    },
  },
  watch: {
    value() {
      this.species = { ...this.value };
    },
  },
};
</script>
