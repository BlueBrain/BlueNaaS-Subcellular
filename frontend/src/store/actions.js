
import socket from '@/services/websocket';
import storage from '@/services/storage';


const actions = {
  async loadCircuit(store) {
    const { circuit } = store.state;
    const neuronDataSet = await storage.getItem('neuronData');

    if (neuronDataSet) {
      circuit.neuronProps = neuronDataSet.properties;
      circuit.neurons = neuronDataSet.data;
      store.$dispatch('initCircuit');
      return;
    }

    store.$emit('showCircuitLoadingModal');

    store.$once('ws:circuit_cell_info', (info) => {
      circuit.neuronCount = info.count;
      circuit.neuronProps = info.properties;
    });

    store.$on('ws:circuit_cells_data', (cellData) => {
      circuit.neurons.push(...cellData);
      const progress = Math.ceil((circuit.neurons.length / circuit.neuronCount) * 100);
      store.$emit('setCircuitLoadingProgress', progress);
      if (circuit.neurons.length === circuit.neuronCount) {
        storage.setItem('neuronData', {
          properties: circuit.neuronProps,
          data: circuit.neurons,
        });
        store.$dispatch('initCircuit');
      }
    });

    socket.request('get_circuit_cells');
  },

  initCircuit(store) {
    store.state.circuit.neuronPropIndex = store.state.circuit.neuronProps
      .reduce((propIndexObj, propName, propIndex) => Object.assign(propIndexObj, {
        [propName]: propIndex,
      }), {});

    const neuronsCount = store.state.circuit.neurons.length;
    store.state.circuit.globalFilterIndex = new Array(neuronsCount).fill(true);
    store.state.circuit.connectionFilterIndex = new Array(neuronsCount).fill(true);

    store.$emit('initNeuronColor');
    store.$emit('updateColorPalette');
    store.$emit('initNeuronPropFilter');
    store.$emit('circuitLoaded');
    store.$emit('hideCircuitLoadingModal');
  },

};

export default actions;
