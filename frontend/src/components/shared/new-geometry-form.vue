<template>
  <div>
    <Row :gutter="12" type="flex">
      <i-col span="12">
        <i-form :label-width="100" @submit.native.prevent>
          <FormItem label="Name *">
            <i-input v-model="modelGeometry.name" @on-change="onChange" />
          </FormItem>

          <FormItem label="Scale">
            <i-input v-model="modelGeometry.meta.scale" @on-change="onChange" type="number" />
          </FormItem>

          <FormItem label="Annotation">
            <i-input
              class="ivu-input--no-resize"
              type="textarea"
              v-model="modelGeometry.description"
              :autosize="{ minRows: 3, maxRows: 3 }"
              @on-change="onChange"
            />
          </FormItem>
          <FormItem label="TetGen mesh *" label-width="105">
            <p>
              <Tag
                :color="modelGeometry.mesh.volume.raw.nodes ? 'success' : 'default'"
                :closable="!!modelGeometry.mesh.volume.raw.nodes"
                @on-close="removeFile('nodes')"
              >
                Nodes
              </Tag>
              <Tag
                :color="modelGeometry.mesh.volume.raw.faces ? 'success' : 'default'"
                :closable="!!modelGeometry.mesh.volume.raw.faces"
                @on-close="removeFile('faces')"
              >
                Faces
              </Tag>
              <Tag
                :color="modelGeometry.mesh.volume.raw.elements ? 'success' : 'default'"
                :closable="!!modelGeometry.mesh.volume.raw.elements"
                @on-close="removeFile('elements')"
              >
                Elements
              </Tag>
            </p>
          </FormItem>
        </i-form>

        <Upload
          type="drag"
          action="/dummy-endpoint"
          multiple
          :format="['node', 'ele', 'face']"
          :before-upload="beforeUpload"
          v-if="!modelGeometry.hasVolumeMesh"
        >
          <div class="container">
            <Icon type="ios-cloud-upload" size="52" style="color: #3399ff"></Icon>
            <p>
              Click or drag TetGen mesh files file here
              <Poptip trigger="hover" :transfer="true">
                <a>(?)</a>
                <div slot="content">
                  <p>
                    Required files for TetGen mesh: <strong>.node</strong>, <strong>.face</strong>,
                    <strong>.ele</strong>
                  </p>
                </div>
              </Poptip>
            </p>
            <p class="error">{{ error }}</p>
            <Spin v-if="loading" size="large" fix />
          </div>
        </Upload>

        <div
          v-for="(structure, idx) of this.modelGeometry.meta.structures"
          :key="idx"
          style="display: flex; margin-top: 10px; margin-bottom: 10px"
        >
          <div
            v-bind:style="{
              backgroundColor: colors[idx].hex(),
              width: `${5}px`,
              marginRight: `${5}px`,
            }"
          />
          <div>
            Name: {{ structure.name }}

            <div>
              tetIdxs:
              <span
                v-for="idx of structure.tetIdxs"
                :key="idx"
                style="display: inline-block; margin-left: 5px"
              >
                {{ idx }}
              </span>
            </div>
          </div>
        </div>

        <i-button v-if="modelGeometry.hasVolumeMesh && !editMode" v-on:click="onAddStructure"
          >Add Structure</i-button
        >

        <div v-if="editMode" style="display: flex; margin-top: 10px; margin-bottom: 10px">
          <div
            v-bind:style="{
              backgroundColor: colors[this.modelGeometry.meta.structures.length].hex(),
              width: `${5}px`,
              marginRight: `${5}px`,
            }"
          />
          <div>
            Name:
            <i-input v-model="newStructureName" style="max-width: 100px; margin-left: 5px" />

            <Dropdown
              style="display: block; margin-top: 5px; margin-bottom: 5px"
              @on-click="handleDropdownChange"
            >
              <a href="javascript:void(0)">
                {{ this.structureType || 'Select structure type' }}
                <Icon type="ios-arrow-down"></Icon>
              </a>
              <DropdownMenu slot="list">
                <DropdownItem :name="'compartment'">Compartment</DropdownItem>
                <DropdownItem :name="'membrane'">Membrane</DropdownItem>
              </DropdownMenu>
            </Dropdown>

            <div v-if="this.$store.state.selectedTetIdxs.length === 0">
              <span v-if="this.structureType === 'compartment'"
                >Click on the tetrahedra that are part of this structure</span
              >
              <span v-if="this.structureType === 'membrane'"
                >Click on the triangles that are part of this structure</span
              >
            </div>

            <div v-else>
              tetIdxs:
              <span
                v-for="idx of this.$store.state.selectedTetIdxs"
                :key="idx"
                style="display: inline-block; margin-left: 5px"
              >
                {{ idx }}
              </span>
            </div>

            <i-button
              style="display: block; margin-top: 10px"
              :disabled="!newStructureName || this.$store.state.selectedTetIdxs.length === 0"
              v-on:click="onSaveStructure"
              >Save Structure</i-button
            >
          </div>
        </div>
      </i-col>
      <i-col span="12">
        <div class="geometry-viewer-container h-100">
          <geometry-viewer
            v-if="modelGeometry.hasVolumeMesh"
            :geometry-data="modelGeometry"
            :structureType="structureType"
            :key="updateModel"
          />
          <div v-else class="p-12">
            <p>Add geometry to visualize it</p>
            <Spin v-if="loading" size="large" fix />
          </div>
        </div>
      </i-col>
    </Row>
  </div>
</template>

<script>
  import Ajv from 'ajv';

  import geometryMetaSchema from '@/schemas/geometry-meta.json';
  import store from '@/store';
  import colors from '@/tools/colors';

  import ModelGeometry from '@/services/model-geometry';
  import GeometryViewer from './geometry-viewer.vue';

  const validateGeometryMeta = new Ajv().compile(geometryMetaSchema);
  const meshTypeMap = {
    node: 'nodes',
    face: 'faces',
    ele: 'elements',
  };

  const geomMetaStructProp = {
    compartment: 'tetIdxs',
    membrane: 'triIdxs',
  };

  export default {
    name: 'model-import',
    props: ['value'],
    components: {
      'geometry-viewer': GeometryViewer,
    },
    data() {
      const modelGeometry = new ModelGeometry();
      return {
        modelGeometry,
        loading: false,
        error: '',
        editMode: false,
        updateModel: 0,
        colors,
        newStructureName: '',
        structureType: '',
      };
    },
    methods: {
      handleDropdownChange(structureType) {
        store.commit('setSelectMode', true);
        this.structureType = structureType;
        store.commit('resetSelectedTetIdxs');
        this.updateModel += 1;
      },
      beforeUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => this.onFileRead(file.name, e.target.result);
        reader.readAsText(file);
        this.error = '';

        // prevent default action to upload data to remote api
        return false;
      },
      reset() {
        this.modelGeometry = new ModelGeometry();
        this.editMode = false;
        this.loading = false;
        store.commit('setSelectMode', false);
        this.newStructureName = '';
        this.structureType = '';
      },
      async onFileRead(fileName, fileContent) {
        const [name, fileExtension] = fileName.split('.');

        this.modelGeometry.meta.meshNameRoot = name;

        if (fileExtension === 'json') {
          this.processJson(fileName, fileContent);
          return;
        }

        this.processMeshFile(fileName, fileContent);

        this.loading = true;
        await this.modelGeometry.init();
        this.loading = false;

        this.onChange();
      },

      processJson(name, content) {
        let geometryMeta = null;
        try {
          geometryMeta = JSON.parse(content);
        } catch (error) {
          this.error = `Can't parse ${name}, check if it's valid json file`;
        }

        if (!geometryMeta) return;

        // json schema validation
        const schemaValid = validateGeometryMeta(geometryMeta);
        if (!schemaValid) {
          const [errObj] = validateGeometryMeta.errors;
          this.error = `geometry.json error: ${errObj.dataPath} ${errObj.message}`;
          return;
        }

        // structure type and indexes property according to validation
        // TODO: move to json schema validation if possible
        const validateStructure = (st) => {
          const valid =
            (st.type === 'compartment' && st.tetIdxs.length) ||
            (st.type === 'membrane' && st.triIdxs.length);

          if (!valid) {
            this.error = `geometry.json error: ${st.name} should contain ${
              geomMetaStructProp[st.type]
            } property`;
          }

          return valid;
        };
        if (!geometryMeta.structures.some((st) => validateStructure(st))) return;

        this.modelGeometry.addMeta(geometryMeta);

        if (this.modelGeometry.hasCompleteRawMesh) {
          this.initModelGeometry();
        }
      },
      processMeshFile(name, content) {
        const [fileExtension] = name.split('.').slice(-1);
        this.modelGeometry.mesh.volume.raw[meshTypeMap[fileExtension]] = content;
      },

      removeFile(type) {
        this.modelGeometry.mesh.volume.raw[type] = '';
        this.modelGeometry.mesh.volume[type] = [];
        this.onChange();
      },
      removeGeometry() {
        this.modelGeometry.meta = null;
        this.onChange();
      },
      onChange() {
        this.$emit('input', this.modelGeometry);
      },
      onAddStructure() {
        this.editMode = true;
      },
      async onSaveStructure() {
        this.editMode = false;
        store.commit('setSelectMode', false);

        const newStructure = {
          name: this.newStructureName,
          type: this.structureType,
        };

        const ids = this.$store.state.selectedTetIdxs;

        if (newStructure.type === 'compartment') {
          newStructure.tetIdxs = ids;
        } else if (newStructure.type === 'membrane') {
          newStructure.triIdxs = ids;
        }

        this.modelGeometry.meta.structures = [...this.modelGeometry.meta.structures, newStructure];

        this.newStructureName = '';
        this.structureType = '';
        store.commit('resetSelectedTetIdxs');

        await this.modelGeometry.generateSurfaceMeshes();

        this.updateModel += 1;
      },
    },
    computed: {
      geometryValid() {
        return !!(
          this.modelGeometry.hasCompleteRawMesh &&
          this.modelGeometry.meta &&
          this.modelGeometry.name
        );
      },
      selectMode() {
        return this.$store.state.selectMode;
      },
    },
  };
</script>

<style lang="scss" scoped>
  .container {
    padding: 20px;
  }

  .error {
    color: red;
  }

  .geometry-viewer-container {
    background-color: #f8f8f9;
    border: 1px solid #dcdee2;
    border-radius: 3px;
    position: relative;
  }
</style>
