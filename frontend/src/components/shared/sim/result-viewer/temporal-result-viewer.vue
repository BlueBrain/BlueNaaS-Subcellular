<template>
  <div ref="chart" class="temporal-graph-container">
    <Spin v-if="!simTraces" fix />
  </div>
</template>

<script>
import noop from 'lodash/noop'
import throttle from 'lodash/throttle'
import Plotly, { layoutAttributes } from 'plotly.js-basic-dist'
import { saveAs } from 'file-saver'
import unzip from 'lodash/unzip'

import simDataStorage from '@/services/sim-data-storage'
import socket from '@/services/websocket'

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
}

const downloadCsvBtn = {
  name: 'downloadCsv',
  title: 'Download source as a CSV',
  icon: Plotly.Icons.disk,
  click: noop,
}

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
]

const config = {
  displayModeBar: true,
  responsive: true,
  displaylogo: false,
  modeBarButtons: [[downloadCsvBtn], plotlyDefaultButtons],
  toImageButtonOptions: {
    width: 1920,
    height: 1080,
  },
}

export default {
  name: 'temporal-result-viewer',
  props: ['simId'],

  created() {
    this.redrawThrottled = throttle(this.redraw, 500)
  },
  mounted() {
    // Request traces
    socket.request('get_trace', this.simId)
    Plotly.newPlot(this.$refs.chart, [], layout, config)
    downloadCsvBtn.click = () => this.downloadCsv()
  },
  beforeDestroy() {
    this.redrawThrottled.cancel()
    Plotly.purge(this.$refs.chart)
  },
  methods: {
    redraw() {
      Plotly.react(this.$refs.chart, this.getChartData())
    },
    getChartData() {
      const traces = this.simTraces
      const observables = traces[0].observables
      const times = traces.flatMap((trace) => trace.times)
      const values = unzip(traces.flatMap((trace) => trace.values))

      return observables.map((observable, idx) => ({
        x: times,
        y: values[idx],
        name: observable,
        type: 'scattergl',
      }))
    },
    downloadCsv() {
      const chartData = this.getChartData()
      const observableNames = chartData.map((data) => data.name)

      const csvHeader = ['Time', ...observableNames].join(',').concat('\n')
      const csvContent = chartData[0].x
        .map((x, idx) => [x, ...chartData.map((data) => data.y[idx])].join(','))
        .join('\n')
      const csv = csvHeader + csvContent

      const csvBlob = new Blob([csv], { type: 'text/plain;charset=utf-8' })

      const modelName = this.$store.state.model.name
      const simName = this.$store.state.model.simulations.find((s) => s.id === this.simId).name
      const daytime = new Date().toISOString()
      const fileName = `${modelName}__${simName}__${daytime}.csv`

      saveAs(csvBlob, fileName)
    },
  },
  computed: {
    simulation() {
      return this.$store.state.model.simulations.find((sim) => sim.id === this.simId)
    },
    simTraces() {
      const traces = this.$store.state.simTraces[this.simId]
      const latest = traces && traces[traces.length - 1]
      const allReceived = latest && latest.last

      if (!allReceived) return

      return traces
    },
  },
  watch: {
    simulation() {
      if (this.simTraces && this.simTraces.length) this.redrawThrottled()
    },
    simTraces() {
      if (this.simTraces && this.simTraces.length) this.redrawThrottled()
    },
  },
}
</script>

<style lang="scss" scoped>
.temporal-graph-container {
  width: 100%;
  height: 100%;
}
</style>
