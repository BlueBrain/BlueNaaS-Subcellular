<template>
  <div class="h-100 pos-relative o-hidden">
    <div class="block-head">
      <h3>Geometry</h3>
    </div>
    <div class="block-main">
      <div class="block-main-inner white-bg p-12">
        <div v-if="geometry" class="h-100">
          <Row :gutter="12" type="flex" class="h-100">
            <i-col span="12">
              <i-form :label-width="100" @submit.native.prevent>
                <FormItem label="Name">
                  <i-input type="text" :value="geometry.name" readonly />
                </FormItem>
                <FormItem label="Description">
                  <i-input
                    type="textarea"
                    :value="geometry.description"
                    :autosize="{ minRows: 3, maxRows: 3 }"
                    readonly
                  />
                </FormItem>
              </i-form>
            </i-col>
            <i-col span="12">
              <div class="geometry-viewer-container h-100">
                <geometry-viewer
                  v-if="geometry && geometry.initialized"
                  :geometry-data="geometry"
                />
              </div>
            </i-col>
          </Row>
        </div>

        <div v-else>
          <strong>No geometry attached to the model</strong>
          <p>Load from geometry DB or create new</p>
          <br />
          <Row>
            <i-col span="12">
              <i-form :label-width="128" @submit.native.prevent>
                <FormItem label="Outer comp. V, m³">
                  <i-input />
                </FormItem>
              </i-form>
            </i-col>
          </Row>
        </div>
      </div>
    </div>
    <div class="block-footer">
      <i-button v-if="!geometry" type="default" @click="showNewGeometryModal">
        Add geometry
      </i-button>

      <i-button v-else type="warning" @click="removeGeometry"> Remove geometry </i-button>
    </div>

    <Modal
      v-model="modelVisible"
      title="New Geometry"
      width="66"
      :closable="!saving"
      :mask-closable="!saving"
      class-name="vertical-center-modal"
      @on-visible-change="onModalVisibleChange"
      @on-ok="onOk"
    >
      <new-geometry-form v-if="modelVisible" ref="newGeometryForm" v-model="newModelGeometry" />
      <div slot="footer">
        <i-button class="mr-6" type="text" :disabled="saving" @click="hideNewGeometryModal">
          Cancel
        </i-button>
        <i-button
          type="primary"
          :loading="saving"
          :disabled="!newModelGeometry || !newModelGeometry.initialized"
          @click="onOk"
        >
          OK
        </i-button>
      </div>
    </Modal>
  </div>
</template>

<script>
import NewGeometryForm from '@/components/shared/new-geometry-form.vue';
import GeometryViewer from '@/components/shared/geometry-viewer.vue';

export default {
  name: 'geometry-component',
  components: {
    'new-geometry-form': NewGeometryForm,
    'geometry-viewer': GeometryViewer,
  },
  data() {
    return {
      modelVisible: false,
      newModelGeometry: null,
      saving: false,
    };
  },
  methods: {
    onModalVisibleChange(visible) {
      if (!visible) this.reset();
    },
    showNewGeometryModal() {
      this.modelVisible = true;
    },
    reset() {
      this.newModelGeometry = null;
      this.saving = false;
      this.$refs.newGeometryForm.reset();
    },
    hideNewGeometryModal() {
      this.modelVisible = false;
      this.reset();
    },
    async onOk() {
      this.saving = true;
      await this.$store.dispatch('createGeometry', this.newModelGeometry);
      this.hideNewGeometryModal();
    },
    removeGeometry() {
      this.$store.dispatch('removeGeometry');
    },
  },
  computed: {
    geometry() {
      return this.$store.state.model.geometry;
    },
  },
};
</script>

<style lang="scss" scoped>
.block-main-inner {
  height: 100%;
}

.white-bg {
  background-color: white;
}

.geometry-viewer-container {
  background-color: #f8f8f9;
  border: 1px solid #dcdee2;
  border-radius: 3px;
}
</style>
