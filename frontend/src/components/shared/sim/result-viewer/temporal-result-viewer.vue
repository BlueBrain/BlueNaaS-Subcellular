<template>
  <div ref="chart" class="temporal-graph-container">
    <Spin v-if="loading" fix />
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import noop from 'lodash/noop';
  import throttle from 'lodash/throttle';
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
    },
    yaxis: {
      ticks: 'outside',
      title: 'Amount of molecules, #',
    },
    hovermode: 'closest',
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

  export default Vue.extend({
    name: 'temporal-result-viewer',
    props: ['simId'],
    data() {
      return {
        loading: true,
        chartPointN: 0,
      };
    },

    created() {
      this.draw = throttle(this.draw, 1000);
    },

    async mounted() {
      const observableNames = this.$store.state.model.observables.map((o) => o.name);

      await Plotly.newPlot(
        this.$refs.chart,
        observableNames.map((ob) => ({
          name: ob,
          type: 'scattergl',
          x: [],
          y: [],
        })),
      );

      simDataStorage.trace.subscribe(this.simId, this.draw);
      const trace = simDataStorage.trace.getCached(this.simId);
      if (!trace) socket.request('get_trace', this.simId);
      if (trace) await this.draw();
      downloadCsvBtn.click = () => this.downloadCsv();
    },
    beforeDestroy() {
      this.draw.cancel();
      simDataStorage.trace.unsubscribe(this.simId);
      Plotly.purge(this.$refs.chart);
    },
    methods: {
      async draw() {
        const data = this.getChartData(this.chartPointN);

        if (!data) return;

        this.chartPointN += data[0].x.length - 1;

        const traceExtension = {
          x: data.map((line) => line.x),
          y: data.map((line) => line.y),
        };

        await Plotly.extendTraces(this.$refs.chart, traceExtension, [...Array(data.length).keys()]);
      },

      getChartData(startIndex = 0) {
        const trace = simDataStorage.trace.getCached(this.simId);

        if (trace) this.loading = false;
        if (!trace) return;

        return Object.keys(trace.values_by_observable).map((k) => ({
          x: trace.times.slice(startIndex),
          y: trace.values_by_observable[k].slice(startIndex),
        }));
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
    },
    watch: {
      simulation() {
        if (this.simTraces && this.simTraces.length) this.draw();
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
