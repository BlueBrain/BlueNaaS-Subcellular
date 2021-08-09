<template>
  <div ref="chart" class="temporal-graph-container">
    <a
      v-if="simulation.status === 'finished'"
      style="color: black; position: absolute; right: 274px; z-index: 1"
      :href="fileUrl"
      download
      >Download</a
    >
    <Spin v-if="loading" fix />
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import throttle from 'lodash/throttle';
  import Plotly from 'plotly.js-basic-dist';

  import { getTrace, subscribeTrace, unsubscribeTrace } from '@/services/sim-data-storage';
  import socket from '@/services/websocket';
  // eslint-disable-next-line
  import { SimTrace, Simulation } from '@/types';

  const layout: Plotly.Layout = {
    xaxis: {
      ticks: 'outside',
      title: 'Time, s',
      autorange: true,
    },
    yaxis: {
      ticks: 'outside',
      title: 'Amount of molecules, #',
      autorange: true,
    },
    hovermode: 'closest',
  };

  const plotlyDefaultButtons = [
    'toImage',
    'zoom2d',
    'pan2d',
    'zoomIn2d',
    'zoomOut2d',
    'autoScale2d',
    'resetScale2d',
    'toggleSpikelines',
    'hoverClosestCartesian',
    'hoverCompareCartesian',
  ];

  const config = {
    displayModeBar: true,
    responsive: true,
    displaylogo: false,
    modeBarButtons: [plotlyDefaultButtons],
    toImageButtonOptions: {
      width: 1920,
      height: 1080,
    },
  };

  type ChartData = {
    x: number[];
    y: number[];
  };

  function floorDiv(a: number, b: number) {
    return Math.max(0, Math.floor(a / b));
  }

  export default Vue.extend({
    name: 'temporal-result-viewer',
    props: ['simId'],
    data() {
      return {
        loading: true,
        chartPointN: 0,
        canExtendTraces: false,
      };
    },

    created() {
      this.extendTraces = throttle(this.extendTraces, 3000);
    },

    async mounted() {
      const observableNames = this.$store.state.model.observables.map((o) => o.name);
      const graphDiv = this.$refs.chart;

      await Plotly.newPlot(
        graphDiv,
        observableNames.map((ob) => ({
          name: ob,
          type: 'scattergl',
          line: { shape: 'spline' },
          x: [],
          y: [],
        })),
        layout,
        config,
      );

      graphDiv.on('plotly_doubleclick', this.handleChartDoubleClick);

      graphDiv.on('plotly_relayout', async (eventData) => {
        const xstart = eventData['xaxis.range[0]'];
        const xend = eventData['xaxis.range[1]'];
        const ystart = eventData['yaxis.range[0]'];
        const yend = eventData['yaxis.range[1]'];

        // When user hits reset axis an event with these properties is emitted
        // This rerenders the whole chart
        if (eventData['xaxis.autorange'] && eventData['yaxis.autorange']) {
          this.handleChartDoubleClick();
          return;
        }

        // If zooming in don't append new data points to the end
        if (xend) this.canExtendTraces = false;
        await this.rerenderChart({ xstart, xend, ystart, yend });
      });

      subscribeTrace(this.simId, this.extendTraces);

      // If there is no data when mounting for this chart request it
      if (!this.trace) {
        this.canExtendTraces = true;
        socket.request('get_trace', this.simId);
        return;
      }

      await this.rerenderChart({});
      this.chartPointN = this.trace.times.length;
      this.canExtendTraces = true;
    },

    async beforeDestroy() {
      this.extendTraces.cancel();
      unsubscribeTrace(this.simId);
      await Plotly.purge(this.$refs.chart);
    },
    methods: {
      handleChartDoubleClick() {
        this.canExtendTraces = true;
        this.rerenderChart({});
      },
      async extendTraces() {
        if (!this.canExtendTraces) return;

        const data = this.getChartData(this.chartPointN) as ChartData[];

        if (!data) return;
        this.chartPointN = getTrace(this.simId).times.length;

        const traceExtension = {
          x: data.map((line) => line.x),
          y: data.map((line) => line.y),
        };

        await Plotly.extendTraces(this.$refs.chart, traceExtension, [...Array(data.length).keys()]);
      },

      getChartData(start = 0, end) {
        const trace = getTrace(this.simId) as SimTrace;

        if (trace) this.loading = false;
        if (!trace) return;

        const times = trace.times;
        const samplingPeriod = this.getSamplingPeriod(times.length);

        return Object.keys(trace.values_by_observable).map((k) => {
          const filterPoint = (time) => (time / this.dt) % samplingPeriod === 0;
          return {
            x: times.slice(start, end).filter(filterPoint),
            y: trace.values_by_observable[k]
              .slice(start, end)
              .filter((value, idx) => filterPoint(times[idx])),
          };
        });
      },

      async rerenderChart({
        xstart,
        xend,
        ystart,
        yend,
      }: {
        xstart?: number;
        xend?: number;
        ystart?: number;
        yend?: number;
      }) {
        if (this.trace) this.loading = false;
        if (!this.trace) return;

        const start = xstart && floorDiv(xstart, this.dt);
        const end = xend && floorDiv(xend, this.dt);

        const slice = this.trace.times.slice(start, end);

        const samplingPeriod = this.getSamplingPeriod(slice.length);

        const chartData = Object.keys(this.trace.values_by_observable).map((observable) => {
          const filterPoint = (time) => floorDiv(time, this.dt) % samplingPeriod === 0;
          return {
            x: slice.filter(filterPoint),
            y: this.trace.values_by_observable[observable]
              .slice(start, end)
              .filter((value, idx) => filterPoint(slice[idx])),
            name: observable,
            type: 'scattergl',
            line: { shape: 'spline' },
          };
        });

        // We need to set autorange back to true as Plotly will mutate layout
        layout.xaxis.autorange = true;
        if (!ystart || !yend) layout.yaxis.autorange = true;
        layout.yaxis.range = [ystart, yend];
        await Plotly.react(this.$refs.chart, chartData, layout, config);
      },

      getSamplingPeriod(length: number) {
        if (length >= 1e6) return 10000;
        if (length >= 1e5) return 1000;
        if (length >= 1e4) return 100;
        if (length >= 1e3) return 10;
        return 1;
      },
    },
    computed: {
      simulation(): Simulation | undefined {
        return this.$store.state.model.simulations.find((sim) => sim.id === this.simId);
      },
      dt(): number {
        return this.simulation.solverConf.dt;
      },
      trace(): SimTrace | undefined {
        return getTrace(this.simId);
      },
      fileUrl() {
        return `https://${window.location.host}/data/traces/${this.simId}.json`;
      },
    },
    watch: {
      simulation() {
        if (this.simTraces && this.simTraces.length) this.extendTraces();
      },
    },
  });
</script>

<style lang="scss" scoped>
  .temporal-graph-container {
    width: 100%;
    height: 100%;
  }
</style>
