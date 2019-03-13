
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
              <i-form
                :label-width="100"
                @submit.native.prevent
              >
                <FormItem label="Name">
                  <i-input type="text" :value="geometry.name" readonly/>
                </FormItem>
                <FormItem label="Annotation">
                  <i-input
                    type="textarea"
                    :value="geometry.annotation"
                    :autosize="{minRows: 3, maxRows: 3}"
                    readonly
                  />
                </FormItem>
              </i-form>
            </i-col>
            <i-col span="12">
              <div class="geometry-viewer-container h-100">
                <geometry-viewer :geometry-data="geometry"/>
              </div>
            </i-col>
          </Row>
        </div>

        <div v-else>
          <strong>No geometry attached to the model</strong>
          <p>Load from geometry DB or create new</p>
          <br>
          <Row>
            <i-col span="12">
              <i-form
                :label-width="120"
                @submit.native.prevent
              >
                <FormItem label="Outer comp. V, m³">
                  <i-input/>
                </FormItem>
              </i-form>
            </i-col>
          </Row>
        </div>

      </div>
    </div>
    <div class="block-footer">
      <i-button
        type="default"
        @click="showNewGeometryModal"
      >
        Create new geometry
      </i-button>
    </div>

    <Modal
      v-model="newGeometryModalVisible"
      title="New Geometry"
      width="66"
      class-name="vertical-center-modal"
      @on-ok="onOk"
    >
      <new-geometry-form v-model="newGeometry"/>
      <div slot="footer">
        <i-button
          class="mr-6"
          type="text"
          @click="hideNewGeometryModal"
        >
          Cancel
        </i-button>
        <i-button
          type="primary"
          :disabled="!newGeometry.valid"
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
        newGeometryModalVisible: false,
        newGeometry: {
          valid: false,
        },
      };
    },
    methods: {
      showNewGeometryModal() {
        this.newGeometryModalVisible = true;
      },
      hideNewGeometryModal() {
        this.newGeometryModalVisible = false;
      },
      onOk() {
        this.hideNewGeometryModal();
        this.$store.dispatch('createGeometry', this.newGeometry);
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
