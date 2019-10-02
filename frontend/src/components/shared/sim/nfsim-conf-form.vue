
<template>
  <i-form
    :label-width="100"
    @submit.native.prevent
  >
    <FormItem label="max_dt, s *">
      <InputNumber
        size="small"
        :min="0.001"
        :max="2"
        :step="0.01"
        v-model="conf.dt"
        @input="onChange"
      />
    </FormItem>
    <FormItem label="t_end, s *">
      <InputNumber
        size="small"
        :min="1"
        :max="1000"
        v-model="conf.tEnd"
        @input="onChange"
      />
    </FormItem>
    <FormItem label="Stimulation">
      <Collapse class="small-collapse">
        <Panel>
          <span
            class="grey-text"
          >
            {{ conf.stimulation.length ? `${conf.stimulation.length} operation(s)` : 'Not set' }}
          </span>
          <div slot="content">
            <nfsim-stimulation-form
              v-model="conf.stimulation"
              @input="onChange"
            />
          </div>
        </Panel>
      </Collapse>
    </FormItem>
  </i-form>
</template>


<script>
  import NfsimStimulationForm from './nfsim-stimulation-form.vue';


  export default {
    name: 'sim-nfsim-conf-form',
    props: ['value'],
    components: {
      'nfsim-stimulation-form': NfsimStimulationForm,
    },
    data() {
      return {
        conf: Object.assign({}, this.value),
      };
    },
    methods: {
      onChange() {
        const valid = this.isValid();
        this.$emit('input', Object.assign({ valid }, this.conf));
      },
      isValid() {
        return this.conf.tEnd && this.conf.dt;
      },
    },
    watch: {
      value() {
        this.conf = Object.assign({}, this.value);
      },
    },
  };
</script>
