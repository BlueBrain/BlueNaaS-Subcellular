
<template>
  <div ref="chart" style="width: 100%; height: 100%;"></div>
</template>


<script>
  import noop from 'lodash/noop';
  import Plotly from 'plotly.js-basic-dist';
  import { saveAs } from 'file-saver';

  const layout = {
    legend: {
      orientation: 'h',
    },
    xaxis: {
      ticks: 'outside',
      title: 'Time, s',
    },
    yaxis: {
      ticks: 'outside',
      title: 'Concentration, # mols',
    },
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
  };

  export default {
    name: 'sim-result-viewer',
    data() {
      return {
        initialized: false,
      };
    },
    props: ['simId'],
    mounted() {
      this.init();
    },
    beforeDestroy() {
      Plotly.purge(this.$refs.chart);
    },
    methods: {
      init() {
        if (!this.simulation.traceTarget && !this.simulation.times.length) return;

        Plotly.newPlot(this.$refs.chart, this.getChartData(), layout, config);
        downloadCsvBtn.click = () => this.downloadCsv();
        this.initialized = true;
      },
      redraw() {
        Plotly.react(this.$refs.chart, this.getChartData(), layout);
      },
      getChartData() {
        return this.simulation.traceTarget === 'observable'
          ? this.observableTargetChartData()
          : this.speciesTargetChartData();
      },
      observableTargetChartData() {
        return this.simulation.observables.reduce((chartDataArray, observable, idx) => {
          const concValues = this.simulation.values.map(concentrations => concentrations[idx]);
          return chartDataArray.concat({
            x: this.simulation.times,
            y: concValues,
            name: observable.name,
            type: 'scatter',
          });
        }, []);
      },
      speciesTargetChartData() {
        return this.simulation.observables.reduce((chartDataArray, observable) => {
          const concValues = this.simulation.values
            .map(concentrations => observable.specIdxs.reduce((sum, specIdx) => sum + concentrations[specIdx], 0));
          return chartDataArray.concat({
            x: this.simulation.times,
            y: concValues,
            name: observable.name,
            type: 'scatter',
          });
        }, []);
      },
      downloadCsv() {
        // TODO: change to comply with new sim trace structure
        const csv = this.simResult.columns.join(',').concat('\n') + this.simResult.values.map(row => row.join(',')).join('\n');
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
          this.redraw();
        } else {
          this.init();
        }
      },
    },
  };
</script>
