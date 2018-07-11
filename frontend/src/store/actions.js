
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

  propFilterUpdated(store) {
    store.$emit('redrawCircuit');
  },

  setSomaSize(store, size) {
    store.state.circuit.somaSize = size;
    store.$emit('setSomaSize', size);
  },

  setSynapseSize(store, size) {
    store.state.circuit.synapseSize = size;
    store.$emit('setSynapseSize', size);
  },

  neuronHovered(store, neuron) {
    // we don't need all properties of neuron to be shown,
    // for example x, y, z can be skipped.
    // TODO: move visible property selection to app config page
    const propsToSkip = ['x', 'y', 'z', 'me_combo', 'morphology'];

    store.$emit('showHoverObjectInfo', {
      header: 'Neuron',
      items: [{
        type: 'table',
        data: pickBy(neuron, (val, prop) => !propsToSkip.includes(prop)),
      }],
    });
  },

  neuronHoverEnded(store) {
    store.$emit('hideHoverObjectInfo');
  },

  neuronClicked(store, neuron) {
    store.$emit('setNeuron', neuron);
  },

  async neuronSelected(store, neuron) {
    store.$emit('setSynapseSelectionState');
    store.$emit('showGlobalSpinner', 'Loading morphology');

    store.state.neuron = neuron;

    const morph = await socket.request('get_cell_morphology', [neuron.gid]);
    Object.assign(store.state.morphology, morph.cells);

    store.$emit('showCellMorphology');
    store.$emit('hideCircuit');

    store.$emit('hideGlobalSpinner');

    store.$dispatch('initSynapses');
  },

  async initSynapses(store) {
    const { gid } = store.state.neuron;

    const res = await socket.request('get_syn_connections', gid);
    const synapseProps = res.synapse_properties;
    const synapsesRaw = res.synapses;

    const synapsePropIndex = synapseProps
      .reduce((propIndexObj, propName, propIndex) => Object.assign(propIndexObj, {
        [propName]: propIndex,
      }), {});

    const synapses = synapsesRaw.map((synVals, synIndex) => {
      const synObject = synapseProps.reduce((synObj, synProp) => Object.assign(synObj, {
        [synProp]: synVals[synapsePropIndex[synProp]],
      }), {});
      const extendedSynObject = Object.assign(synObject, { gid, index: synIndex, visible: true });
      return extendedSynObject;
    });

    store.state.synapses = synapses;
    store.state.synapseProps = synapseProps;

    store.$emit('initSynapseCloud');
    store.$emit('initSynapsePropFilter');
  },

  synapseHovered(store, synapseIndex) {
    const synapse = store.$get('synapse', synapseIndex);
    const neuron = store.$get('neuron', synapse.preGid - 1);
    store.$emit('showHoverObjectInfo', {
      header: 'Synapse',
      items: [{
        type: 'table',
        data: {
          id: `(${synapse.gid}, ${synapse.index})`,
          pre_gid: synapse.preGid,
          post_gid: synapse.gid,
          type: `${synapse.type} (${synapse.type >= 100 ? 'EXC' : 'INH'})`,
        },
      }, {
        subHeader: 'Pre-synaptic cell:',
        type: 'table',
        data: pickBy(neuron, (val, prop) => ['etype', 'mtype'].includes(prop)),
      }],
    });
  },

  synapseHoverEnded(store) {
    store.$emit('hideHoverObjectInfo');
  },
  },

};

export default actions;
