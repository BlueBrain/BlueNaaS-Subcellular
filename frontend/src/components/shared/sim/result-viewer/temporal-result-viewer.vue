<template>
  <div ref="chart" class="temporal-graph-container">
    <Spin v-if="!initialized" fix />
  </div>
</template>

<script>
import noop from 'lodash/noop'
import throttle from 'lodash/throttle'
import Plotly from 'plotly.js-basic-dist'
import { saveAs } from 'file-saver'

import simDataStorage from '@/services/sim-data-storage'

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
  data() {
    return {
      initialized: false,
      chartPointN: 0,
    }
  },
  created() {
    this.redrawThrottled = throttle(this.redraw.bind(this), 250)
  },
  async mounted() {
    await this.init()
    simDataStorage.trace.subscribe(this.simId, this.redrawThrottled)
  },
  beforeDestroy() {
    this.redrawThrottled.cancel()
    simDataStorage.trace.unsubscribe(this.simId)
    Plotly.purge(this.$refs.chart)
  },
  methods: {
    async init() {
      const trace = await simDataStorage.trace.get(this.simId)

      if (!trace || !trace.times.length) return

      this.chartPointN = trace.values.length
      await Plotly.newPlot(this.$refs.chart, this.getChartData(), layout, config)
      downloadCsvBtn.click = () => this.downloadCsv()
      this.initialized = true
    },
    async redraw() {
      const chartDataDiff = this.getChartData(this.chartPointN)
      const xDiffList = chartDataDiff.map((diff) => diff.x)
      const yDiffList = chartDataDiff.map((diff) => diff.y)
      const extTraceTarget = [...Array(xDiffList.length).keys()]
      this.chartPointN += xDiffList[0].length
      await Plotly.extendTraces(this.$refs.chart, { x: xDiffList, y: yDiffList }, extTraceTarget)
    },
    getChartData(startIndex = 0) {
      const trace = simDataStorage.trace.getCached(this.simId)

      return trace.observables.reduce((chartDataArray, observable, idx) => {
        const molCounts = trace.values.slice(startIndex).map((concentrations) => concentrations[idx])

        return chartDataArray.concat({
          x: trace.times.slice(startIndex),
          y: molCounts,
          name: observable,
          type: 'scattergl',
        })
      }, [])
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
  },
  watch: {
    simulation() {
      if (this.initialized) {
        this.redrawThrottled()
      } else {
        this.init()
      }
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
