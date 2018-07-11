
// TODO: write documentation

const state = {
  circuit: {
    neurons: [],
    neuronPropIndex: {},
    neuronProps: [],
    somaSize: 10,
    synapseSize: 1,
    globalFilterIndex: [],
    color: {
      neuronProp: '',
      neuronProps: [],
      uniqueValuesByProp: {},
      palette: {},
    },
  },
  synapses: [],
  synapseProps: [],
  neuron: null,
  synapse: null,
  morphology: {},
  view: {
    axonVisible: false,
  },
};

export default state;
