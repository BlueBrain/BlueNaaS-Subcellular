<template>
  <div>
    <i-form :label-width="100" @submit.native.prevent>
      <FormItem label="Name *">
        <i-input v-model="name" />
      </FormItem>
      <FormItem label="Annotation">
        <i-input
          class="ivu-input--no-resize"
          type="textarea"
          v-model="description"
          :autosize="{ minRows: 3, maxRows: 3 }"
        />
      </FormItem>
      <FormItem label="TetGen mesh *">
        <p>
          <Tag :color="!!files.node ? 'success' : 'default'" :closable="!!files.node" @on-close="removeFile('node')">
            Nodes
          </Tag>
          <Tag :color="!!files.face ? 'success' : 'default'" :closable="!!files.face" @on-close="removeFile('face')">
            Faces
          </Tag>
          <Tag :color="!!files.ele ? 'success' : 'default'" :closable="!!files.ele" @on-close="removeFile('ele')">
            Elements
          </Tag>
        </p>
      </FormItem>
      <FormItem label="Geometry json *">
        <Tag
          :color="this.files.json ? 'success' : 'default'"
          :closable="!!this.files.json"
          @on-close="removeFile('json')"
        >
          Geometry json
        </Tag>
      </FormItem>
    </i-form>

    <Upload type="drag" multiple action="" :format="uploadComponentFormat" :before-upload="beforeUpload">
      <div class="container">
        <Icon type="ios-cloud-upload" size="52" style="color: #3399ff"></Icon>
        <p>
          Click or drag TetGen mesh files and geometry.json file here
          <Poptip trigger="hover" :transfer="true">
            <a>(?)</a>
            <div slot="content">
              <p>
                Required files for TetGen mesh: <strong>.node</strong>, <strong>.face</strong>,
                <strong>.ele</strong>
              </p>
              <p>
                geometry.json should contain: <br />
                * <strong>scale</strong>: mesh scale * <strong>meshNameRoot</strong>: name of TetGen files (without
                extension) <br />
                * <strong>structures</strong>: collection of objects with name, type ("compartment" or "membrane") and
                tetIdxs(comp)|triIdxs(memb) defined<br />
                * <strong>freeDiffusionBoundaries</strong>: collection of objects with name and triIdxs params defined
              </p>
            </div>
          </Poptip>
        </p>
        <p class="error">{{ error }}</p>
        <Spin v-if="loading" size="large" fix />
      </div>
    </Upload>
    <i-button @click="onOk" :disabled="Object.keys(files).length < 4 || !name">Ok</i-button>
  </div>
</template>

<script lang="ts">
import GeometryViewer from './geometry-viewer.vue'
import { post } from '@/services/api'

const uploadComponentFormat = ['node', 'ele', 'face', 'json']

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
      description: '',
      loading: false,
      tetGenFileNameBase: null,
      error: '',
      files: {},
    }
  },
  methods: {
    beforeUpload(file) {
      this.files = { ...this.files, [file.name.split('.').pop()]: file }
      // prevent default action to upload data to remote api
      return false
    },

    removeFile(type) {
      this.files = { ...this.files, [type]: undefined }
    },
    async onOk() {
      const form = new FormData()
      form.append('name', this.name)
      form.append('annotation', this.description)
      form.append('model_id', this.$store.state.model.id)
      form.append('user_id', this.$store.state.model.user_id)
      for (const file of Object.values(this.files)) form.append('files', file as Blob)
      const geometry = (await post('geometries', form)).data
      this.$emit('input', geometry)
    },
  },
}
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
