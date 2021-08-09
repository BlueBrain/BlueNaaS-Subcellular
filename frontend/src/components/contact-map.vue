<template>
  <div id="contact-map" style="height: 1000px"></div>
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
    name: 'contact-map',

    created() {
      if (this.model?.id !== null && !this.viz) {
        socket.request('contact-map', this.model);
      }
    },

    mounted() {
      this.graph = cytoscape({
        container: document.getElementById('contact-map'),
        style: [
          {
            selector: 'node',
            style: { label: 'data(label)' },
          },
        ],
      });

      this.graph.on('scrollzoom dragpan', () => {
        const conf = this.config || { viewport: {}, nodes: {} };
        store.commit('setContactMapConfig', {
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

        store.commit('setContactMapConfig', cloneDeep(conf));
      });

      this.graph.on('click', 'node', () => {
        this.$router.push('/model/species');
      });

      if (this.viz) {
        this.draw();
      }
    },

    methods: {
      draw() {
        const data = cloneDeep(this.viz);
        const nodes = this.config?.nodes;
        const viewport = this.config?.viewport;

        if (!data) return;

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

        const cfg = { nodes: [], viewport: {} };
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
          store.commit('setContactMapConfig', cfg);
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
        return this.$store.state.model.contactMap;
      },
      config() {
        return this.$store.state.model.graphCfg;
      },
    },
    watch: {
      viz() {
        this.draw();
      },
    },
  });
</script>
