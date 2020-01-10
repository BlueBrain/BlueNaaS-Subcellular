
<template>
  <div>
    <Row :gutter="12" type="flex">
      <i-col span="12">
        <i-form
          :label-width="100"
          @submit.native.prevent
        >
          <FormItem label="Name *">
            <i-input
              v-model="modelGeometry.name"
              @on-change="onChange"
            />
          </FormItem>
          <FormItem label="Annotation">
            <i-input
              class="ivu-input--no-resize"
              type="textarea"
              v-model="modelGeometry.description"
              :autosize="{minRows: 3, maxRows: 3}"
              @on-change="onChange"
            />
          </FormItem>
          <FormItem label="TetGen mesh *">
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
          <FormItem label="Geometry json *">
            <Tag
              :color="modelGeometry.meta ? 'success' : 'default'"
              :closable="!!modelGeometry.meta"
              @on-close="removeGeometry"
            >
              Geometry json
            </Tag>
          </FormItem>
        </i-form>

        <Upload
          type="drag"
          action="/dummy-endpoint"
          multiple
          :format="uploadComponentFormat"
          :before-upload="beforeUpload"
        >
          <div class="container">
            <Icon type="ios-cloud-upload" size="52" style="color: #3399ff"></Icon>
            <p>
              Click or drag TetGen mesh files and geometry.json file here
              <Poptip
                trigger="hover"
                :transfer="true"
              >
                <a>(?)</a>
                <div slot="content">
                  <p>
                    Required files for TetGen mesh: <strong>.node</strong>, <strong>.face</strong>, <strong>.ele</strong>
                  </p>
                  <p>
                    geometry.json should contain: <br>
                    * <strong>scale</strong>: mesh scale
                    * <strong>meshNameRoot</strong>: name of TetGen files (without extension) <br>
                    * <strong>structures</strong>: collection of objects with name, type ("compartment" or "membrane") and tetIdxs(comp)|triIdxs(memb) defined<br>
                    * <strong>freeDiffusionBoundaries</strong>: collection of objects with name and triIdxs params defined
                  </p>
                </div>
              </Poptip>
            </p>
            <p class="error">{{ error }}</p>
            <Spin
              v-if="loading"
              size="large"
              fix
            />
          </div>
        </Upload>
      </i-col>
      <i-col span="12">
        <div class="geometry-viewer-container h-100">
          <geometry-viewer
            v-if="modelGeometry.initialized"
            :geometry-data="modelGeometry"
          />
          <div
            v-else
            class="p-12"
          >
            <p>Add geometry to visualize it</p>
            <Spin
              v-if="loading"
              size="large"
              fix
            />
          </div>
        </div>
      </i-col>
    </Row>
  </div>
</template>


<script>
  import get from 'lodash/get';
  import Ajv from 'ajv';

  import geometryMetaSchema from '@/schemas/geometry-meta.json';

  import constants from '@/constants';
  import ModelGeometry from '@/services/model-geometry';
  import GeometryViewer from './geometry-viewer.vue';

  const validateGeometryMeta = new Ajv().compile(geometryMetaSchema);
  const { StructureType } = constants;
  const uploadComponentFormat = ['node', 'ele', 'face', 'json'];
  const meshTypeMap = {
    node: 'nodes',
    face: 'faces',
    ele: 'elements',
  };

  const geomMetaStructProp = {
    [StructureType.COMPARTMENT]: 'tetIdxs',
    [StructureType.MEMBRANE]: 'triIdxs',
  };

  // TODO: refactor
  export default {
    name: 'model-import',
    props: ['value'],
    components: {
      'geometry-viewer': GeometryViewer,
    },
    data() {
      const modelGeometry = new ModelGeometry();

      return {
        uploadComponentFormat,
        modelGeometry,
        loading: false,
        tetGenFileNameBase: null,
        error: '',
      };
    },
    methods: {
      beforeUpload(file) {
        const reader = new FileReader();
        reader.onload = e => this.onFileRead(file.name, e.target.result);
        reader.readAsText(file);
        this.error = '';

        // prevent default action to upload data to remote api
        return false;
      },
      reset() {
        this.modelGeometry = new ModelGeometry();
        this.loading = false;
      },
      onFileRead(fileName, fileContent) {
        const [fileExtension] = fileName.split('.').slice(-1);

        if (fileExtension === 'json') {
          this.processJson(fileName, fileContent);
          return;
        }

        this.processMeshFile(fileName, fileContent);
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
          const valid = (st.type === StructureType.COMPARTMENT && st.tetIdxs.length)
            || (st.type === StructureType.MEMBRANE && st.triIdxs.length);

          if (!valid) {
            this.error = `geometry.json error: ${st.name} should contain ${geomMetaStructProp[st.type]} property`;
          }

          return valid;
        };
        if (!geometryMeta.structures.some(st => validateStructure(st))) return;

        // TODO: DRY
        if (
          this.tetGenFileNameBase
          && this.tetGenFileNameBase !== geometryMeta.meshNameRoot
        ) {
          this.error = this.getMeshNameMismatchErrorStr(
            geometryMeta.meshNameRoot,
            this.tetGenFileNameBase,
          );
          return;
        }

        if (!this.tetGenFileNameBase) {
          this.tetGenFileNameBase = get(this.modelGeometry, 'meta.meshNameRoot');
        }

        this.modelGeometry.addMeta(geometryMeta);

        if (this.modelGeometry.hasCompleteRawMesh) {
          this.initModelGeometry();
        }
      },
      processMeshFile(name, content) {
        const [fileExtension] = name.split('.').slice(-1);

        const fileNameBase = name.split('.').slice(0, -1).join('.');
        if (
          this.tetGenFileNameBase
          && this.tetGenFileNameBase !== fileNameBase
        ) {
          this.error = this.getMeshNameMismatchErrorStr(
            this.geometry.meshNameRoot,
            this.tetGenFileNameBase,
          );
          return;
        }

        if (!this.tetGenFileNameBase) {
          this.tetGenFileNameBase = fileNameBase;
        }

        this.modelGeometry.mesh.volume.raw[meshTypeMap[fileExtension]] = content;

        if (this.modelGeometry.hasCompleteRawMesh) {
          this.initModelGeometry();
        }
      },
      async initModelGeometry() {
        this.loading = true;
        await this.modelGeometry.init({ removeRawMesh: false });
        this.loading = false;
      },
      getMeshNameMismatchErrorStr(meshNameRoot, tetgenMeshName) {
        return `meshNameRoot property of JSON file: ${meshNameRoot}, `
          + `doesn't match mesh file names: ${tetgenMeshName}`;
      },
      removeFile(type) {
        const rawMesh = this.modelGeometry.mesh.volume.raw;
        rawMesh[type] = null;

        this.modelGeometry.initialized = false;

        if (
          !Object.values(rawMesh).reduce((acc, c) => acc && c, true)
          && !this.modelGeometry.meshNameRoot
        ) {
          this.tetGenFileNameBase = null;
        }

        this.onChange();
      },
      removeGeometry() {
        this.modelGeometry.meta = null;
        this.modelGeometry.initialized = false;
        this.onChange();
      },
      onChange() {
        this.$emit('input', this.modelGeometry);
      },
    },
    computed: {
      geometryValid() {
        return !!(
          this.modelGeometry.hasCompleteRawMesh
          && this.modelGeometry.meta
          && this.modelGeometry.name
        );
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
