<template>
  <div class="h-100 pos-relative">
    <div class="block-head">
      <h3>Geometry</h3>
    </div>
    <div class="block-main" style="overflow: scroll; background-color: white">
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
                    class="ivu-input--no-resize"
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
                  v-if="geometry && geometry.hasVolumeMesh"
                  :geometry-data="geometry"
                />
              </div>
            </i-col>
          </Row>
        </div>

        <div v-else>
          <new-geometry-form ref="newGeometryForm" v-model="newModelGeometry" />
          <div slot="footer">
            <i-button class="mr-6" type="text" :disabled="saving" @click="reset"> Cancel </i-button>
            <i-button
              type="primary"
              :loading="saving"
              :disabled="
                !newModelGeometry || !newModelGeometry.hasVolumeMesh || !newModelGeometry.name
              "
              @click="onOk"
            >
              OK
            </i-button>
          </div>
        </div>
      </div>
    </div>
    <div class="block-footer">
      <i-button v-if="geometry" type="warning" @click="removeGeometry"> Remove geometry </i-button>
    </div>
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
        newModelGeometry: null,
        saving: false,
      };
    },
    methods: {
      reset() {
        this.newModelGeometry = null;
        this.saving = false;
        if (this.$refs.newGeometryForm) this.$refs.newGeometryForm.reset();
      },
      async onOk() {
        this.saving = true;
        await this.$store.dispatch('createGeometry', this.newModelGeometry);
        this.reset();
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
