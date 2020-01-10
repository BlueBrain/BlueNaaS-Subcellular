
<template>
  <div class="container">
    <div class="log-type-block">
      Log type:

      <i-select
        class="select ml-6"
        size="small"
        v-model="logType"
        @on-change="onLogTypeChange"
      >
        <i-option
          v-for="logType in logTypes"
          :key="logType"
          :value="logType"
        >
          {{ logTypeLabel[logType] }}
        </i-option>
      </i-select>

      <Checkbox
        class="ml-12"
        v-model="follow"
      >
        Follow logs
      </Checkbox>
    </div>

    <pre
      ref="log"
      class="log-content-block"
    >{{ logContent }}</pre>
  </div>
</template>


<script>
  import throttle from 'lodash/throttle';

  import simDataStorage from '@/services/sim-data-storage';


  const MAX_LINES = 2000;
  
  const logTypeLabel = {
    bng_stdout: 'BioNetGen stdout',
    bng_stderr: 'BioNetGen stderr',
    nfsim_stdout: 'NFsim stdout',
    nfsim_stderr: 'NFsim stderr',
    model_bngl: 'BioNetGen model',
    model_rnf: 'NFSim run script',
    system: 'System',
    rnf: '.rnf',
  };

  export default {
    name: 'sim-log-viewer',
    props: ['simId'],
    mounted() {
      this.init();
      const updateLogThrottled = throttle(this.updateLog.bind(this), 250);
      simDataStorage.log.subscribe(this.simId, updateLogThrottled);
    },
    beforeDestroy() {
      simDataStorage.log.unsubscribe(this.simId);
    },
    data() {
      return {
        logTypeLabel,
        logTypes: [],
        logType: '',
        logContent: '',
        follow: true,
      };
    },
    methods: {
      async init(log = null) {
        if (log) {
          this.log = log;
        } else {
          this.log = await simDataStorage.log.get(this.simId);
        }

        this.logTypes = Object.keys(this.log);
        this.logType = this.logTypes[0] || '';
        this.logContent = this.logType
          ? this.getLogStr(this.logType)
          : '';

        this.scrollToBottom();
      },
      onLogTypeChange(logType) {
        this.logContent = this.getLogStr(logType)
      },
      scrollToBottom() {
        this.$nextTick(() => {
          const logContainer = this.$refs.log;
          logContainer.scrollTop = logContainer.scrollHeight;
        })
      },
      getLogStr(type) {
        return this.log[type]
          .slice(-MAX_LINES)
          .join('\n');
      },
      updateLog(log) {
        if (!this.logType) {
          this.init(log);
        } else {
          this.log = log;
          this.logContent = this.getLogStr(this.logType);
        }

        if (!this.follow) return;

        this.scrollToBottom();
      },
    },
  };
</script>


<style lang="scss" scoped>
  .container {
    padding: 12px;
    width: 100%;
    height: 100%;
    display: relative;
  }

  .select {
    width: 200px;
  }

  .log-type-block {
    height: 40px;
  }

  .log-content-block {
    height: calc(100% - 40px);
    padding: 12px;
    overflow-y: scroll;
    white-space: pre-wrap;
    background-color:#263238;
    color: #e9eded;
    font-size: 12px;
  }
</style>
