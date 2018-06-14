
<template>
  <div>
    <Form :label-width="65" label-position="left">
      <FormItem label="Color by:" style="margin-bottom: 0">
        <i-select
          size="small"
          placeholder="Color by"
          v-model="currentProp"
          :transfer="true"
          placement="top"
          @on-change="onColorPropChange"
        >
          <i-option
            v-for="neuronProp in props"
            :value="neuronProp"
            :key="neuronProp"
          >{{ neuronProp }}</i-option>
        </i-select>
      </FormItem>
    </Form>
  </div>
</template>

<script>
  import store from '@/store';


  export default {
    name: 'neuron-color',
    data() {
      return {
        props: [],
        currentProp: '',
        uniqueValuesByProp: {},
      };
    },
    mounted() {
      store.$on('initNeuronColorCtrl', this.init);
    },
    methods: {
      init() {
        const { neuronProp, neuronProps } = store.state.circuit.color;

        this.props = neuronProps;
        this.currentProp = neuronProp;
      },
      onColorPropChange(colorProp) {
        store.$dispatch('updateColorProp', colorProp);
      },
    },
  };
</script>
