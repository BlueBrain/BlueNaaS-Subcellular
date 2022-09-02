<template>
  <Upload type="drag" action="/" :format="['bngl', 'json', 'xml']" :disabled="loading" :before-upload="beforeUpload">
    <div class="container">
      <Icon type="ios-cloud-upload" size="52" style="color: #3399ff"></Icon>
      <p>Click or drag files here to upload</p>
      <p>Supported formats: BNGL, eBNGL, SBML*</p>
      <br />
      <div class="text-left">
        <small>* Experimental feature</small>
      </div>
      <Spin v-if="loading" size="large" fix />
    </div>
  </Upload>
</template>

<script lang="ts">
import { post, get } from '@/services/api'

const formatByExt = {
  json: {
    type: 'ebngl',
    label: 'eBNGL',
  },
  ebngl: {
    type: 'ebngl',
    label: 'eBNGL',
  },
  bngl: {
    type: 'bngl',
    label: 'BNGL',
  },
  xml: {
    type: 'sbml',
    label: 'SBML',
  },
}

export default {
  name: 'model-import',
  data() {
    return {
      allowedExtensions: Object.keys(formatByExt),
      loading: false,
    }
  },
  methods: {
    async beforeUpload(file) {
      this.loading = true

      const user_id = this.$store.state.user?.id
      if (!user_id) return

      const form = new FormData()
      form.append('file', file)
      form.append('user_id', user_id)

      const model = await post('import-bngl', form)

      if (!model)
        this.$Notice.error({
          title: 'Import error',
          desc: 'There was an error importing the model',
        })

      this.$store.commit('loadDbModel', model.data)

      this.loading = false
      this.$emit('import-finish')

      const models = await get('models')
      this.$store.commit('updateDbModels', models.data)

      return false
    },
  },
}
</script>

<style lang="scss" scoped>
.container {
  padding: 12px;
  padding-top: 20px;
}
</style>
