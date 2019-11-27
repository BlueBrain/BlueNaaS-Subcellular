
<template>
  <div
    ref="chart"
    class="temporal-graph-container"
  />
</template>


<script>
  import noop from 'lodash/noop';
  import throttle from 'lodash/throttle';
  import Plotly from 'plotly.js-basic-dist';
  import { saveAs } from 'file-saver';

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
    modeBarButtons: [
      [downloadCsvBtn],
      plotlyDefaultButtons,
    ],
    toImageButtonOptions: {
      width: 1920,
      height: 1080,
    },
  };

  export default {
    name: 'temporal-result-viewer',
    props: ['simId'],
    data() {
      return {
        initialized: false,
        chartPointN: 0,
      };
    },
    created() {
      this.redrawThrottled = throttle(this.redraw, 500);
    },
    mounted() {
      this.init();
    },
    beforeDestroy() {
      this.redrawThrottled.cancel();
      Plotly.purge(this.$refs.chart);
    },
    methods: {
      init() {
        if (!this.simulation.traceTarget && !this.simulation.times.length) return;

        this.chartPointN = this.simulation.values.length;
        Plotly.newPlot(this.$refs.chart, this.getChartData(), layout, config);
        downloadCsvBtn.click = () => this.downloadCsv();
        this.initialized = true;
      },
      redraw() {
        const chartDataDiff = this.getChartData(this.chartPointN);
        const xDiffList = chartDataDiff.map(diff => diff.x);
        const yDiffList = chartDataDiff.map(diff => diff.y);
        const extTraceTarget = [...Array(xDiffList.length).keys()];
        Plotly.extendTraces(this.$refs.chart, { x: xDiffList, y: yDiffList }, extTraceTarget);
        this.chartPointN += xDiffList[0].length;
      },
      getChartData(startIndex = 0) {
        return this.simulation.traceTarget === 'observable'
          ? this.observableTargetChartData(startIndex)
          : this.speciesTargetChartData(startIndex);
      },
      observableTargetChartData(startIndex) {
        return this.simulation.observables.reduce((chartDataArray, observable, idx) => {
          const concValues = this.simulation.values
            .slice(startIndex)
            .map(concentrations => concentrations[idx]);
          return chartDataArray.concat({
            x: this.simulation.times.slice(startIndex),
            y: concValues,
            name: observable.name,
            type: 'scattergl',
          });
        }, []);
      },
      speciesTargetChartData(startIndex) {
        return this.simulation.observables.reduce((chartDataArray, observable) => {
          const concValues = this.simulation.values
            .slice(startIndex)
            .map(concentrations => observable.specIdxs.reduce((sum, specIdx) => sum + concentrations[specIdx], 0));
          return chartDataArray.concat({
            x: this.simulation.times.slice(startIndex),
            y: concValues,
            name: observable.name,
            type: 'scattergl',
          });
        }, []);
      },
      downloadCsv() {
        const chartData = this.getChartData();
        const observableNames = chartData.map(data => data.name);

        const csvHeader = ['Time', ...observableNames].join(',').concat('\n');
        const csvContent = chartData[0].x.map((x, idx) => [x, ...chartData.map(data => data.y[idx])].join(',')).join('\n');
        const csv = csvHeader + csvContent;

        const csvBlob = new Blob([csv], { type: 'text/plain;charset=utf-8' });

        const modelName = this.$store.state.model.name;
        const simName = this.$store.state.model.simulations.find(s => s.id === this.simId).name;
        const daytime = new Date().toISOString();
        const fileName = `${modelName}__${simName}__${daytime}.csv`;

        saveAs(csvBlob, fileName);
      },
    },
    computed: {
      simulation() {
        return this.$store.state.model.simulations.find(sim => sim.id === this.simId);
      },
    },
    watch: {
      simulation() {
        if (this.initialized) {
          this.redrawThrottled();
        } else {
          this.init();
        }
      },
    },
  };
</script>


<style lang="scss" scoped>
  .temporal-graph-container {
    width: 100%;
    height: 100%;
  }
</style>
