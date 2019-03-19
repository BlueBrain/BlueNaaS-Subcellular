
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
        :max="600"
        v-model="conf.tEnd"
        @input="onChange"
      />
    </FormItem>
    <FormItem label="Stimuli">
      <Collapse class="small-collapse">
        <Panel>
          <span
            class="grey-text"
          >
            {{ conf.stimuli.length ? `${conf.stimuli.length} operation(s)` : 'Not set' }}
          </span>
          <div slot="content">
            <steps-stimuli-form
              v-model="conf.stimuli"
              @input="onChange"
            />
          </div>
        </Panel>
      </Collapse>
    </FormItem>
  </i-form>
</template>


<script>
  import StepsStimuliForm from './steps-stimuli-form.vue';

  export default {
    name: 'sim-steps-conf-form',
    props: ['value'],
    components: {
      'steps-stimuli-form': StepsStimuliForm,
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
        return this.conf.dt && this.conf.tEnd;
      },
    },
  };
</script>


<style lang="scss">
  .grey-text {
    color: #999;
  }

  .small-collapse {
    margin-top: 3px;

    .ivu-collapse-header {
      height: 24px !important;
      line-height: 24px !important;
      padding-left: 6px;

      i.ivu-icon {
        margin-right: 6px;
      }
    }
    .ivu-collapse-content {
      padding: 0 !important;
    }

    .ivu-collapse-content-box {
      padding: 0 !important;
    }
  }
</style>
