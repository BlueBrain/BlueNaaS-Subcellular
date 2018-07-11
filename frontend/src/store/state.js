
// TODO: write documentation

const state = {
  circuit: {
    neurons: [],
    neuronPropIndex: {},
    neuronProps: [],
    somaSize: 10,
    globalFilterIndex: [],
    color: {
      neuronProp: '',
      neuronProps: [],
      uniqueValuesByProp: {},
      palette: {},
    },
  },
  neuron: null,
  morphology: {},
  view: {
    axonVisible: false,
  },
};

export default state;
