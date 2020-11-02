<template>
  <i-form :label-width="100" @submit.native.prevent>
    <FormItem label="max_dt, s *">
      <InputNumber
        v-model="conf.dt"
        size="small"
        :min="0.000000001"
        :max="1"
        :step="0.01"
        :active-change="false"
        @input="onChange"
      />
    </FormItem>
    <FormItem label="t_end, s *">
      <InputNumber
        v-model="conf.tEnd"
        size="small"
        :min="1"
        :active-change="false"
        @input="onChange"
      />
      <span class="text-error form-input-msg" v-if="traceMaxSizeReached">
        Max simulation result size reached,
        <code>[observable_n] * [t_end] / [max_dt]</code> should be less then 10M
      </span>
    </FormItem>
    <FormItem label="Stimulation">
      <Collapse class="small-collapse">
        <Panel>
          <span class="grey-text">
            {{ conf.stimulation.length ? `${conf.stimulation.length} operation(s)` : 'Not set' }}
          </span>
          <div slot="content">
            <nfsim-stimulation-form v-model="conf.stimulation" @input="onChange" />
          </div>
        </Panel>
      </Collapse>
    </FormItem>
  </i-form>
</template>

<script>
  import { SIM_TRACE_MAX_SIZE } from '@/constants';

  import NfsimStimulationForm from './nfsim-stimulation-form.vue';

  export default {
    name: 'sim-nfsim-conf-form',
    props: ['value'],
    components: {
      'nfsim-stimulation-form': NfsimStimulationForm,
    },
    data() {
      return {
        conf: { ...this.value },
      };
    },
    methods: {
      onChange() {
        this.$emit('input', { ...this.conf, valid: this.isValid });
      },
    },
    computed: {
      traceMaxSizeReached() {
        const observableN = this.$store.state.model.observables.length;
        return (observableN * this.conf.tEnd) / this.conf.dt > SIM_TRACE_MAX_SIZE;
      },
      isValid() {
        return this.conf.tEnd && this.conf.dt && !this.traceMaxSizeReached;
      },
    },
    watch: {
      value() {
        this.conf = { ...this.value };
      },
    },
  };
</script>
