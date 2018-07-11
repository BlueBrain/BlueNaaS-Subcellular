
import * as DistinctColors from 'distinct-colors';

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

    const circuitInfo = await socket.request('get_circuit_info');
    circuit.neuronCount = circuitInfo.count;
    circuit.neuronProps = circuitInfo.properties;

    store.$on('ws:circuit_cells', (cellData) => {
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

    socket.send('get_circuit_cells');
  },

  initCircuitColorPalette(store) {
    const { neurons, neuronProps } = store.state.circuit;
    const neuronSample = neurons[0];

    const uniqueValuesByProp = neuronProps.reduce((valueObj, propName, propIndex) => {
      const propsToSkip = ['x', 'y', 'z'];
      if (propsToSkip.includes(propName)) return valueObj;

      const propType = typeof neuronSample[propIndex];
      if (propType !== 'string' && propType !== 'number') return valueObj;

      const propUniqueValues = Array.from(new Set(neurons.map(n => n[propIndex])));
      if (propUniqueValues.length > 20) return valueObj;

      return Object.assign(valueObj, { [propName]: propUniqueValues.sort() });
    }, {});

    const neuronColorProps = Object.keys(uniqueValuesByProp);
    const neuronColorProp = neuronColorProps.includes('layer') ? 'layer' : this.props[0];

    Object.assign(store.state.circuit.color, {
      uniqueValuesByProp,
      neuronProps: neuronColorProps,
      neuronProp: neuronColorProp,
    });

    store.$dispatch('generateCircuitColorPalette');
  },

  generateCircuitColorPalette(store) {
    const { uniqueValuesByProp, neuronProp } = store.state.circuit.color;

    const currentPropValues = uniqueValuesByProp[neuronProp];

    const colorConfig = {
      count: currentPropValues.length,
      hueMin: 0,
      hueMax: 360,
      chromaMin: 60,
      chromaMax: 100,
      lightMin: 20,
      lightMax: 90,
    };

    const colors = new DistinctColors(colorConfig);

    const colorPalette = currentPropValues.reduce((palette, propVal, i) => {
      return Object.assign(palette, { [propVal.toString()]: colors[i].gl() });
    }, {});

    store.state.circuit.color.palette = colorPalette;
    store.$emit('updateColorPalette');
  },

  updateColorProp(store, colorProp) {
    store.state.circuit.color.neuronProp = colorProp;
    store.$dispatch('generateCircuitColorPalette');
    store.$emit('redrawCircuit');
  },

  initCircuit(store) {
    store.state.circuit.neuronPropIndex = store.state.circuit.neuronProps
      .reduce((propIndexObj, propName, propIndex) => Object.assign(propIndexObj, {
        [propName]: propIndex,
      }), {});

    const neuronsCount = store.state.circuit.neurons.length;
    store.state.circuit.globalFilterIndex = new Array(neuronsCount).fill(true);
    store.state.circuit.connectionFilterIndex = new Array(neuronsCount).fill(true);

    store.$dispatch('initCircuitColorPalette');
    store.$emit('initNeuronColorCtrl');

    store.$emit('initNeuronPropFilter');
    store.$emit('circuitLoaded');
    store.$emit('hideCircuitLoadingModal');
  },

  colorUpdated(store) {
    store.$emit('redrawCircuit');
  },

  setSomaSize(store, size) {
    store.state.circuit.somaSize = size;
    store.$emit('setSomaSize', size);
  },

};

export default actions;
