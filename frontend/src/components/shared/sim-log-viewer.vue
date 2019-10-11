
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
          {{ LogTypeEnum[logType] }}
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
  const LogTypeEnum = {
    bng_stdout: 'BioNetGen stdout',
    bng_stderr: 'BioNetGen stderr',
    nfsim_stdout: 'NFsim stdout',
    nfsim_stderr: 'NFsim stderr',
    system: 'System',
    rnf: '.rnf',
  };

  const logPriority = [
    'system',
    'bng_stderr',
    'nfsim_stderr',
    'nfsim_stdout',
    'bng_stdout',
    'rnf',
  ];

  export default {
    name: 'sim-log-viewer',
    props: ['simId'],
    data() {
      const sim = this.$store.state.model.simulations.find(s => s.id === this.simId);

      const logTypes = Object.keys(LogTypeEnum)
        .reduce((a, logType) => a.concat(sim.log[logType] ? logType : []), []);

      const initialLogType = logPriority.find(logType => sim.log[logType])
        || Object.keys(sim.log)[0];

      return {
        LogTypeEnum,
        logTypes,
        simName: sim.name,
        log: sim.log,
        logType: initialLogType,
        follow: true,
      };
    },
    methods: {
      onLogTypeChange(logType) {
        this.logContent = this.log[logType];
      },
    },
    computed: {
      logContent() {
        if (!this.log || !this.logType) return '';

        return this.log[this.logType];
      },
    },
    watch: {
      logContent() {
        if (!this.follow) return;

        this.$nextTick(() => {
          const logContainer = this.$refs.log;
          logContainer.scrollTop = logContainer.scrollHeight;
        });
      }
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
