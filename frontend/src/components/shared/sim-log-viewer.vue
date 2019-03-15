
<template>
  <div class="container">
    <div class="log-type-block">
      <i-form>
        <FormItem label="Log type:">
          <i-select
            class="select"
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
        </FormItem>
      </i-form>
    </div>
    <pre class="log-content-block">
      {{ logContent }}
    </pre>
  </div>
</template>


<script>
  const LogTypeEnum = {
    bng_stdout: 'BioNetGen stdout',
    bng_stderr: 'BioNetGen stderr',
    nfsim_stdout: 'NFsim stdout',
    nfsim_stderr: 'NFsim stderr',
    system: 'System',
  };

  export default {
    name: 'sim-log-viewer',
    props: ['simId'],
    data() {
      const sim = this.$store.state.model.simulations.find(s => s.id === this.simId);

      const logTypes = Object.keys(LogTypeEnum)
        .reduce((a, logType) => a.concat(sim.log[logType] ? logType : []), []);

      let initialLogType = '';

      if (sim.error) {
        if (sim.log.system) {
          initialLogType = 'system';
        } else if (sim.log.nfsim_stderr) {
          initialLogType = 'nfsim_stderr';
        } else if (sim.log.nfsim_stdout) {
          initialLogType = 'nfsim_stdout';
        } else if (sim.log.bng_stderr) {
          initialLogType = 'bng_stderr';
        } else {
          initialLogType = 'bng_stdout';
        }
      } else {
        initialLogType = 'nfsim_stdout';
      }

      return {
        LogTypeEnum,
        logTypes,
        simName: sim.name,
        log: sim.log,
        logType: initialLogType,
        logContent: sim.log[initialLogType],
      };
    },
    methods: {
      onLogTypeChange(logType) {
        this.logContent = this.log[logType];
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
    overflow: scroll;
    background-color:#263238;
    color: #e9eded;
    font-size: 14px;
  }
</style>
