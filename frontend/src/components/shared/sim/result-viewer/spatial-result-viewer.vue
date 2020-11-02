<template>
  <div class="h-100 w-100 pos-relative" ref="container">
    <div class="agenda-container">
      <h3 class="mb-6">Structures</h3>
      <div class="comp-type-agenda" v-for="(label, stType) in structureTypeLabel" :key="stType">
        <div v-if="structure[stType].length">
          <p class="mb-6">{{ label }}:</p>
          <div class="mb-4" v-for="st in structure[stType]" :key="st.name">
            <i-switch
              class="mr-6 switch--extra-small"
              v-model="st.visible"
              size="small"
              :style="st.visible ? { 'background-color': st.color } : {}"
              @on-change="onStructureVisibilityChange(st)"
            />
            <span>{{ st.name }}</span>
          </div>
        </div>
      </div>

      <h3 class="mb-6 mt-12">Molecules</h3>
      <div class="mb-4" v-for="molecule in molecules" :key="molecule.name">
        <i-switch
          class="mr-6 switch--extra-small"
          v-model="molecule.visible"
          size="small"
          :style="molecule.visible ? { 'background-color': molecule.color } : {}"
          @on-change="onMoleculeVisibilityChange(molecule)"
        />
        <span>{{ molecule.name }}</span>
      </div>
    </div>

    <div class="display-conf-container">
      <i-form :label-width="120">
        <FormItem label="Surface opacity">
          <Slider
            v-model="displayConf.meshSurfaceOpacity"
            :min="0"
            :max="1"
            :step="0.01"
            @on-input="onDisplayConfChange"
          />
        </FormItem>
        <FormItem label="Wireframe opacity">
          <Slider
            v-model="displayConf.meshWireframeOpacity"
            :min="0"
            :max="1"
            :step="0.01"
            @on-input="onDisplayConfChange"
          />
        </FormItem>
        <Divider />
        <FormItem label="Molecule size">
          <Slider
            v-model="displayConf.moleculeSize"
            :min="0.01"
            :max="0.3"
            :step="0.01"
            @on-input="onDisplayConfChange"
          />
        </FormItem>
      </i-form>
    </div>

    <div class="progress-ctrl-container">
      <i-button
        class="ml-6 mr-12"
        type="dashed"
        :icon="progressCtrl.replaying ? 'ios-pause' : 'ios-play'"
        shape="circle"
        :disabled="!nextStepAvailable"
        @click="onPlayToggle"
      />
      <ButtonGroup size="default" shape="circle">
        <Button
          type="dashed"
          icon="ios-skip-backward"
          :disabled="!previousStepAvailable"
          @click="onPreviousStepClick"
        />
        <Button
          type="dashed"
          icon="ios-skip-forward"
          :disabled="!nextStepAvailable"
          @click="onNextStepClick"
        />
      </ButtonGroup>
      <Slider
        class="video-progress-slider inline-block ml-24"
        v-model="progressCtrl.stepIdx"
        :min="0"
        :max="simulatedStepsN - 1"
        :step="1"
        transfer
        @on-input="onProgressInput"
        @on-change="onProgressChange"
      />
      <span class="time-label-container ml-12 mr-12">
        step:
        <span v-if="!progressCtrl.live">{{ progressCtrl.stepIdx + 1 }} / </span>
        {{ simulatedStepsN }}
      </span>
      <Poptip trigger="click" title="Replay settings">
        <Button type="dashed" shape="circle" icon="ios-settings" />
        <div slot="content">
          <span>Max animation speed, fps: </span>
          <InputNumber
            v-model="progressCtrl.replayFps"
            class="replay-fps-input ml-6"
            :min="1"
            :max="25"
            :step="1"
            :active-change="false"
          />
        </div>
      </Poptip>
      <i-button
        class="live-btn ml-12 mr-6"
        :icon="progressCtrl.live ? 'ios-pulse' : ''"
        :type="progressCtrl.live ? 'info' : 'default'"
        :disabled="!liveAvailable"
        @click="toggleLive"
      >
        Live
      </i-button>
    </div>

    <canvas ref="canvas" />
  </div>
</template>

<script>
  import throttle from 'lodash/throttle';

  import ModelGeometryRenderer from '@/services/model-geometry-renderer';
  import constants from '@/constants';
  import bus from '@/services/event-bus';
  import simDataStorage from '@/services/sim-data-storage';

  const { StructureType, SimStatus } = constants;

  export default {
    name: 'spatial-result-viewer',
    props: ['simId'],
    data() {
      return {
        displayConf: {
          meshSurfaceOpacity: 0.25,
          meshWireframeOpacity: 0.5,
          moleculeSize: 0.15,
        },
        simulatedStepsN: 0,
        ignoreProgressChange: false,
        progressCtrl: {
          stepIdx: 0,
          live: true,
          replayFps: 5,
          replaying: false,
        },
        structure: {
          compartments: [],
          membranes: [],
        },
        molecules: [],
        structureTypeLabel: {
          compartments: 'Compartments',
          membranes: 'Membranes',
        },
      };
    },
    created() {
      this.progressCtrl.live = this.liveAvailable;
      this.renderMoleculesThrottled = throttle(this.renderMolecules.bind(this));
    },
    async mounted() {
      this.renderer = new ModelGeometryRenderer(this.$refs.canvas);

      this.onLayoutChangeBinded = this.onLayoutChange.bind(this);
      bus.$on('layoutChange', this.onLayoutChangeBinded);

      const onSpatialTraceChangeThrottled = throttle(this.onSpatialStepTrace.bind(this), 250);
      simDataStorage.spatialTrace.subscribe(this.simId, onSpatialTraceChangeThrottled);

      const lastStepIdx = await simDataStorage.spatialTrace.getLastStepIdx(this.simId);
      this.simulatedStepsN = lastStepIdx + 1;

      if (this.liveAvailable) {
        this.progressCtrl.stepIdx = lastStepIdx;
        this.progressCtrl.live = true;
      } else {
        this.progressCtrl.stepIdx = 0;
      }

      setTimeout(() => {
        this.initGeometry();

        this.renderMoleculesByStepIdx(this.progressCtrl.stepIdx);
      }, 10);
    },
    beforeDestroy() {
      bus.$off('layoutChange', this.onLayoutChangeBinded);
      simDataStorage.spatialTrace.unsubscribe(this.simId);
      this.renderer.destroy();
    },
    methods: {
      initGeometry() {
        this.renderer.initGeometry(this.geometry, this.displayConf);
        const structure = (this.geometry.meta.structures || []).map((st, idx) => ({
          name: st.name,
          color: this.renderer.colors[idx].css(),
          visible: true,
          type: st.type,
        }));

        this.structure.compartments = structure.filter(
          (st) => st.type === StructureType.COMPARTMENT,
        );

        this.structure.membranes = structure.filter((st) => st.type === StructureType.MEMBRANE);

        // TODO: make simulation config immutable after simulation has been started
        const moleculeNames = this.sim.solverConf.spatialSampling.observables.map((o) => o.name);

        this.renderer.initMolecules(moleculeNames);

        this.molecules = Object.entries(this.renderer.moleculeConfig).map(([name, mol]) => ({
          name,
          color: mol.color.css(),
          visible: true,
        }));
      },
      onLayoutChange() {
        this.renderer.onResize();
      },
      onSpatialStepTrace(spatialStepTrace) {
        this.lastSpatialStepTrace = spatialStepTrace;

        this.simulatedStepsN = this.lastSpatialStepTrace.stepIdx + 1;

        if (this.progressCtrl.live) {
          this.progressCtrl.stepIdx = this.lastSpatialStepTrace.stepIdx;
          this.renderMolecules(this.lastSpatialStepTrace);
        }
      },
      onNextStepClick() {
        if (this.progressCtrl.replaying) this.stopReplay();
        if (this.progressCtrl.live) {
          this.progressCtrl.live = false;
        }

        this.progressCtrl.stepIdx += 1;
        this.renderMoleculesByStepIdx(this.progressCtrl.stepIdx);
      },
      onPreviousStepClick() {
        if (this.progressCtrl.replaying) this.stopReplay();
        if (this.progressCtrl.live) {
          this.progressCtrl.live = false;
        }

        this.progressCtrl.stepIdx -= 1;
        this.renderMoleculesByStepIdx(this.progressCtrl.stepIdx);
      },
      onPlayToggle() {
        this.progressCtrl.replaying = !this.progressCtrl.replaying;

        if (this.progressCtrl.replaying) {
          this.startReplay();
        } else {
          this.stopReplay();
        }
      },
      startReplay() {
        this.progressCtrl.replaying = true;
        this.replayRun();
      },
      async replayRun() {
        if (!this.progressCtrl.replaying) return;

        if (this.progressCtrl.stepIdx + 1 === this.simulatedStepsN) {
          if (this.liveAvailable) {
            this.progressCtrl.live = true;
            return;
          }

          this.stopReplay();
        }

        this.progressCtrl.stepIdx += 1;
        await this.renderMoleculesByStepIdx(this.progressCtrl.stepIdx);

        // TODO: start fetching data for next frame right after render and then make an appropriate
        // timeout by given step trace fetch time and pfs
        if (!this.progressCtrl.replaying) return;

        const timeout = 1000 / this.progressCtrl.replayFps;
        this.replayTimer = setTimeout(() => this.replayRun(), timeout);
      },
      stopReplay() {
        this.progressCtrl.replaying = false;
        clearTimeout(this.replayTimer);
      },
      onProgressInput(stepIdx) {
        if (this.progressCtrl.stepIdx === stepIdx) return;
        this.progressCtrl.live = false;
        renderMoleculesByStepIdx(stepIdx);
      },
      onProgressChange(stepIdx) {
        this.progressCtrl.live = false;
        if (this.progressCtrl.replaying) {
          this.stopReplay();
        }

        this.renderMoleculesByStepIdx(stepIdx);
      },
      async renderMoleculesByStepIdx(stepIdx) {
        const spatialStepTrace = await simDataStorage.spatialTrace.getStepByIdx(
          this.simId,
          stepIdx,
        );
        if (!spatialStepTrace) {
          console.warn(`No spatial trace is found for stepIdx: ${stepIdx}`);
          return;
        }

        this.lastSpatialStepTrace = spatialStepTrace;
        this.renderMoleculesThrottled(spatialStepTrace);
      },
      onStructureVisibilityChange(comp) {
        this.renderer.setVisible(comp.name, comp.visible);
        this.renderMolecules();
      },
      onDisplayConfChange() {
        this.renderer.setDisplayConf(this.displayConf);
      },
      onMoleculeVisibilityChange(molecule) {
        this.renderer.setMoleculeConfig(molecule.name, {
          visible: molecule.visible,
        });
        this.renderMolecules();
      },
      renderMolecules(spatialStepTrace) {
        this.renderer.renderMolecules(spatialStepTrace || this.lastSpatialStepTrace);
      },
      toggleLive() {
        this.progressCtrl.live = !this.progressCtrl.live;

        if (this.progressCtrl.live) {
          if (this.progressCtrl.replaying) {
            this.stopReplay();
          }

          this.progressCtrl.stepIdx = this.simulatedStepsN;
          this.renderMoleculesByStepIdx(this.simId, this.progressCtrl.stepIdx);
        }
      },
    },
    computed: {
      geometry() {
        return this.$store.state.model.geometry;
      },
      sim() {
        return this.$store.state.model.simulations.find((sim) => sim.id === this.simId);
      },
      liveAvailable() {
        return [
          SimStatus.READY_TO_RUN,
          SimStatus.INIT,
          SimStatus.QUEUED,
          SimStatus.STARTED,
        ].includes(this.sim.status);
      },
      previousStepAvailable() {
        return this.progressCtrl.stepIdx > 0;
      },
      nextStepAvailable() {
        return this.progressCtrl.stepIdx + 1 < this.simulatedStepsN;
      },
    },
  };
</script>

<style lang="scss" scoped>
  .structure-agenda-container,
  .display-conf-container,
  .agenda-container,
  .progress-ctrl-container {
    background-color: #ffffff;
    border: 1px solid #cacbcf;
    border-radius: 3px;
    position: absolute;
    z-index: 2;
    padding: 6px;
    max-height: calc(100% - 12px);
    // overflow-y: scroll;
  }

  .comp-type-agenda {
    padding: 6px 0;
  }

  .structure-agenda-container {
    padding-bottom: 2px;
    left: 12px;
    bottom: 12px;

    span {
      vertical-align: middle;
    }
  }

  .display-conf-container {
    padding: 6px;
    padding-right: 12px;
    right: 12px;
    bottom: 12px;
    width: 400px;

    .ivu-form-item {
      margin-bottom: 0;
    }

    .ivu-divider {
      margin: 6px 0;
    }
  }

  .agenda-container {
    top: 12px;
    left: 12px;
  }

  .progress-ctrl-container {
    bottom: 12px;
    right: 424px;
    & > * {
      vertical-align: middle;
    }
  }

  .color-block {
    display: inline-block;
    height: 14px;
    width: 14px;
    border: 1px solid #808080;
    vertical-align: middle;
  }

  canvas {
    position: absolute;
    height: 100% !important;
    width: 100% !important;
  }

  .video-progress-slider {
    width: 380px;
  }

  .time-label-container {
    display: inline-block;
    text-align: center;
    width: 128px;
  }

  .replay-fps-input {
    width: 48px;
  }

  .live-btn {
    width: 68px;
  }
</style>
