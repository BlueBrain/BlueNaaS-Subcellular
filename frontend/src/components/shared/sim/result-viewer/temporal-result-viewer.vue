<template>
  <div ref="chart" class="temporal-graph-container">
    <Spin v-if="loading" fix />
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import noop from 'lodash/noop';
  import throttle from 'lodash/throttle';
  import debounce from 'lodash/debounce';
  import Plotly, { layoutAttributes } from 'plotly.js-basic-dist';
  import { saveAs } from 'file-saver';
  import unzip from 'lodash/unzip';

  import simDataStorage from '@/services/sim-data-storage';
  import socket from '@/services/websocket';
  import { SimTrace, Simulation } from '@/types';

  const layout = {
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
    uirevision: 'true',
  };

  const downloadCsvBtn = {
    name: 'downloadCsv',
    title: 'Download source as a CSV',
    icon: Plotly.Icons.disk,
    click: noop,
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
    modeBarButtons: [[downloadCsvBtn], plotlyDefaultButtons],
    toImageButtonOptions: {
      width: 1920,
      height: 1080,
    },
  };

  type ChartData = {
    x: number[];
    y: number[];
  };

  export default Vue.extend({
    name: 'temporal-result-viewer',
    props: ['simId'],
    data() {
      return {
        loading: true,
        chartPointN: 0,
        canExtendTraces: true,
      };
    },

    created() {
      this.extendTraces = throttle(this.extendTraces, 3000);
      this.renrenderChart = debounce(this.rerenderChart, 500);
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
      );

      graphDiv.on('plotly_relayout', (eventData) => {
        if (!eventData['xaxis.range[0]']) return;
        this.canExtendTraces = false;
        this.rerenderChart(eventData);
      });

      simDataStorage.trace.subscribe(this.simId, this.extendTraces);
      const trace = simDataStorage.trace.getCached(this.simId);
      if (!trace) socket.request('get_trace', this.simId);
      if (trace) await this.extendTraces();
      downloadCsvBtn.click = () => this.downloadCsv();
    },
    beforeDestroy() {
      this.extendTraces.cancel();
      simDataStorage.trace.unsubscribe(this.simId);
      Plotly.purge(this.$refs.chart);
    },
    methods: {
      async extendTraces() {
        if (!this.canExtendTraces) return;
        const data = this.getChartData(this.chartPointN) as ChartData[];

        if (!data) return;

        this.chartPointN = simDataStorage.trace?.getCached(this.simId).times.length || 0;

        const traceExtension = {
          x: data.map((line) => line.x),
          y: data.map((line) => line.y),
        };

        await Plotly.extendTraces(this.$refs.chart, traceExtension, [...Array(data.length).keys()]);
      },

      getChartData(start = 0, end = -1) {
        const trace = simDataStorage.trace.getCached(this.simId) as SimTrace;

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

      async rerenderChart(eventData) {
        if (!eventData['xaxis.range[0]']) return;

        const trace = simDataStorage.trace.getCached(this.simId) as SimTrace;
        if (trace) this.loading = false;
        if (!trace) return;

        const rangeStart = eventData['xaxis.range[0]'];
        const rangeEnd = eventData['xaxis.range[1]'];

        const start = floorDiv(rangeStart, this.dt);
        const end = floorDiv(rangeEnd, this.dt);

        const slice = trace.times.slice(start, end);

        const samplingPeriod = this.getSamplingPeriod(slice.length);

        const chartData = Object.keys(trace.values_by_observable).map((observable) => {
          const filterPoint = (time) => floorDiv(time, this.dt) % samplingPeriod === 0;
          return {
            x: slice.filter(filterPoint),
            y: trace.values_by_observable[observable]
              .slice(start, end)
              .filter((value, idx) => filterPoint(slice[idx])),
            name: observable,
            type: 'scattergl',
            line: { shape: 'spline' },
          };
        });

        await Plotly.react(this.$refs.chart, chartData, layout);

        if (end >= trace.times.length) this.canExtendTraces = true;
      },

      getSamplingPeriod(length: number) {
        if (length >= 1e6) return 10000;
        if (length >= 1e5) return 1000;
        if (length >= 1e4) return 100;
        if (length >= 1e3) return 10;
        return 1;
      },

      downloadCsv() {
        const chartData = this.getChartData();
        const observableNames = chartData.map((data) => data.name);

        const csvHeader = ['Time', ...observableNames].join(',').concat('\n');
        const csvContent = chartData[0].x
          .map((x, idx) => [x, ...chartData.map((data) => data.y[idx])].join(','))
          .join('\n');
        const csv = csvHeader + csvContent;

        const csvBlob = new Blob([csv], { type: 'text/plain;charset=utf-8' });

        const modelName = this.$store.state.model.name;
        const simName = this.$store.state.model.simulations.find((s) => s.id === this.simId).name;
        const daytime = new Date().toISOString();
        const fileName = `${modelName}__${simName}__${daytime}.csv`;

        saveAs(csvBlob, fileName);
      },
    },
    computed: {
      simulation(): Simulation | undefined {
        return this.$store.state.model.simulations.find((sim) => sim.id === this.simId);
      },
      dt(): number {
        return this.simulation.solverConf.dt;
      },
    },
    watch: {
      simulation() {
        if (this.simTraces && this.simTraces.length) this.extendTraces();
      },
    },
  });

  function floorDiv(a: number, b: number) {
    return Math.max(0, Math.floor(a / b));
  }
</script>

<style lang="scss" scoped>
  .temporal-graph-container {
    width: 100%;
    height: 100%;
  }
</style>
