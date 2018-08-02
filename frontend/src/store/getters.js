
const getters = {
  neuron(store, index) {
    const { neurons, neuronPropIndex } = store.state.circuit;

    return Object.keys(neuronPropIndex)
      .reduce((nrn, prop) => {
        const propValue = neurons[index][neuronPropIndex[prop]];
        return Object.assign(nrn, { [prop]: propValue });
    }, { gid: index + 1 });
  },

  neuronPosition(store, index) {
    const { neurons, neuronPropIndex } = store.state.circuit;

    return [
      neurons[index][neuronPropIndex.x],
      neurons[index][neuronPropIndex.y],
      neurons[index][neuronPropIndex.z],
    ];
  },

  synapse(store, synapseIndex) {
    return store.state.synapses[synapseIndex];
  },
};

export default getters;
