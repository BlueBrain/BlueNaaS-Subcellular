
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
              v-model="name"
              @on-change="onChange"
            />
          </FormItem>
          <FormItem label="Annotation">
            <i-input
              type="textarea"
              v-model="annotation"
              :autosize="{minRows: 3, maxRows: 3}"
              @on-change="onChange"
            />
          </FormItem>
          <FormItem label="TetGen mesh *">
            <p>
              <Tag
                :color="file.nodes ? 'success' : 'default'"
                :closable="!!file.nodes"
                @on-close="removeFile('nodes')"
              >
                Nodes
              </Tag>
              <Tag
                :color="file.faces ? 'success' : 'default'"
                :closable="!!file.faces"
                @on-close="removeFile('faces')"
              >
                Faces
              </Tag>
              <Tag
                :color="file.elements ? 'success' : 'default'"
                :closable="!!file.elements"
                @on-close="removeFile('elements')"
              >
                Elements
              </Tag>
            </p>
          </FormItem>
          <FormItem label="Geometry json *">
            <Tag
              :color="geometry ? 'success' : 'default'"
              :closable="!!geometry"
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
          </div>
        </Upload>
      </i-col>
      <i-col span="12">
        <div class="geometry-viewer-container h-100">
          <geometry-viewer
            v-if="geometryData"
            :geometry-data="geometryData"
          />
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
  import TetGenMesh from '@/services/tetgen';
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

  export default {
    name: 'model-import',
    props: ['value'],
    components: {
      'geometry-viewer': GeometryViewer,
    },
    data() {
      return {
        uploadComponentFormat,
        name: '',
        annotation: '',
        file: {
          nodes: null,
          elements: null,
          faces: null,
        },
        tetGenFileNameBase: null,
        geometry: null,
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

      onFileRead(fileName, fileContent) {
        const [fileExtension] = fileName.split('.').slice(-1);

        if (fileExtension === 'json') {
          this.processJson(fileName, fileContent);
          return;
        }

        this.processMeshFile(fileName, fileContent);
      },
      processJson(name, content) {
        let geometry = null;
        try {
          geometry = JSON.parse(content);
        } catch (error) {
          this.error = `Can't parse ${name}, check if it's valid json file`;
        }

        if (!geometry) return;

        // json schema validation
        const schemaValid = validateGeometryMeta(geometry);
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
        if (!geometry.structures.some(st => validateStructure(st))) return;

        // TODO: DRY
        if (
          this.tetGenFileNameBase
          && this.tetGenFileNameBase !== geometry.meshNameRoot
        ) {
          this.error = this.getMeshNameMismatchErrorStr(
            geometry.meshNameRoot,
            this.tetGenFileNameBase,
          );
          return;
        }

        if (!this.tetGenFileNameBase) {
          this.tetGenFileNameBase = geometry.meshNameRoot;
        }

        this.geometry = geometry;
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

        this.file[meshTypeMap[fileExtension]] = Object.freeze(content);
      },
      getMeshNameMismatchErrorStr(meshNameRoot, tetgenMeshName) {
        return `meshNameRoot property of JSON file: ${meshNameRoot}, `
          + `doesn't match mesh file names: ${tetgenMeshName}`;
      },
      removeFile(type) {
        this.file[type] = null;

        if (
          !this.file.values().reduce((acc, c) => acc && c, true)
          && !this.geometry
        ) {
          this.tetGenFileNameBase = null;
        }
      },
      removeGeometry() {
        this.geometry = null;
      },
      onChange() {
        if (this.geometryValid) this.emitChange();
      },
      emitChange() {
        const modelGeometry = {
          ...this.geometry,
          name: this.name,
          annotation: this.annotation,
          file: this.file,
          valid: this.geometryValid,
        };
        this.$emit('input', Object.assign({}, this.value, modelGeometry));
      },
    },
    watch: {
      geometryValid() {
        this.onChange();
      },
    },
    computed: {
      geometryValid() {
        return !!(
          this.file.nodes
          && this.file.elements
          && this.file.faces
          && this.geometry
          && this.name
        );
      },
      geometryData() {
        if (
          !this.file.nodes
          || !this.file.elements
          || !this.file.faces
        ) return null;

        const mesh = new TetGenMesh(
          this.file.nodes,
          this.file.faces,
          this.file.elements,
        );

        return {
          nodes: Object.freeze(mesh.nodes),
          faces: Object.freeze(mesh.faces),
          elements: Object.freeze(mesh.elements),
          structures: get(this.geometry, 'structures'),
          freeDiffusionBoundaries: get(this.geometry, 'freeDiffusionBoundaries'),
          scale: get(this.geometry, 'scale'),
        };
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
  }
</style>
