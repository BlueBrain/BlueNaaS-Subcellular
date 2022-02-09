<template>
  <div style="position: relative">
    <div id="reactivity-network" style="height: 50vh"></div>
    <div style="position: absolute; background: white">
      <span style="font-weight: bold">Select species</span>
      <div class="mb-4" v-for="species in model.species" :key="species.name">
        <i-switch
          class="mr-6 switch--extra-small"
          :value="selectedSpecies.has(species.name)"
          @on-change="handleSpeciesSelection(species.name)"
        />
        <span>{{ species.name }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import cloneDeep from 'lodash/cloneDeep';

import socket from '@/services/websocket';
import store from '../store';

cytoscape.use(coseBilkent);

export default Vue.extend({
  name: 'reactivity-network',
  data() {
    return {
      selectedSpecies: new Set([]),
    };
  },
  created() {
    if (this.model?.id !== null) {
      socket.request('reactivity-network', this.model);
    }
  },

  mounted() {
    this.graph = cytoscape({
      container: document.getElementById('reactivity-network'),
      style: [
        {
          selector: 'node',
          style: { label: 'data(label)' },
        },
      ],
    });

    this.graph.on('scrollzoom dragpan', () => {
      const conf = this.config || { viewport: {}, nodes: {} };
      store.commit('setReactivityNetworkCfg', {
        ...conf,
        viewport: {
          ...conf.viewport,
          zoom: this.graph.zoom(),
          pan: this.graph.pan(),
        },
      });
    });

    this.graph.on('dragfreeon', 'node', () => {
      const conf = this.config || { viewport: {}, nodes: {} };

      for (const node of this.graph.nodes()) {
        conf.nodes[node.id()] = node.position();
      }

      store.commit('setReactivityNetworkCfg', cloneDeep(conf));
    });
  },

  methods: {
    handleSpeciesSelection(species) {
      if (this.selectedSpecies.has(species)) this.selectedSpecies.delete(species);
      else this.selectedSpecies.add(species);

      if (this.model?.id !== null) {
        socket.request('reactivity-network', {
          ...this.model,
          species: this.model.species.filter((sp) => this.selectedSpecies.has(sp.name)),
        });
      }
    },
    draw() {
      const data = cloneDeep(this.viz);
      const nodes = this.config?.nodes;

      const viewport = this.config?.viewport;

      if (!data) return;

      this.graph.elements().remove();

      const elements = [
        ...data.nodes.map((node) => {
          return {
            data: {
              id: node.id,
              parent: node.gid,
              label: node.label,
            },
            position: nodes && {
              x: nodes[node.id]?.x,
              y: nodes[node.id]?.y,
            },
          };
        }),
        ...data.edges.map((edge) => {
          return {
            data: {
              source: edge.source,
              target: edge.target,
            },
          };
        }),
      ];

      this.graph.add(elements);

      const cfg = { nodes: {}, viewport: {} };
      if (!this.config) {
        const layout = this.graph.layout({
          name: 'cose-bilkent',
        });
        layout.run();

        for (const node of this.graph.nodes()) {
          cfg.nodes[node.data().id] = {
            x: node.position().x,
            y: node.position().y,
          };
        }

        store.commit('setReactivityNetworkCfg', cfg);
      }

      if (viewport) {
        if (viewport.zoom) this.graph.zoom(viewport.zoom);
        if (viewport.pan) this.graph.pan(viewport.pan);
      }
    },
  },

  computed: {
    model() {
      return this.$store.state.model;
    },
    viz() {
      return this.$store.state.model.reactivityNetwork;
    },
    config() {
      return this.$store.state.model.reactivityNetworkCfg;
    },
  },
  watch: {
    viz() {
      this.draw();
    },
    model() {
      this.selectedSpecies = new Set(this.model.species.map((sp) => sp.name));
    },
  },
});
</script>
