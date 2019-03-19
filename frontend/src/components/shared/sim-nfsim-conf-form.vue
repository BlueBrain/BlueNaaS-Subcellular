
<template>
  <i-form
    :label-width="100"
    @submit.native.prevent
  >
    <FormItem label="t_end, s">
      <InputNumber
        size="small"
        :min="1"
        :max="1000"
        v-model="conf.tEnd"
        @input="onChange"
      />
    </FormItem>
    <FormItem label="n_steps">
      <InputNumber
        size="small"
        :min="1"
        :max="10000"
        v-model="conf.nSteps"
        @input="onChange"
      />
    </FormItem>
  </i-form>
</template>


<script>
  export default {
    name: 'sim-nfsim-conf-form',
    props: ['value'],
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
        return this.conf.tEnd && this.conf.nSteps;
      },
    },
  };
</script>
