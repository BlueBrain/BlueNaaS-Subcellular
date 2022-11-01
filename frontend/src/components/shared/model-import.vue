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
      let model: any

      const user_id = this.$store.state.user?.id
      if (!user_id) return

      this.modelName = file.name.split('.').slice(0, -1).join('.')
      const format = file.name.split('.').slice(-1)[0].toLowerCase()

      if (format === 'ebngl') {
        const reader = new FileReader()
        reader.addEventListener(
          'load',
          async () => {
            const r = JSON.parse(reader.result as string)
            const model = await post('clone-model', {
              model_id: r['id'],
            })
            if (!model) {
              this.$Notice.error({
                title: 'Import error',
                desc: 'There was an error importing the model',
              })
              this.loading = false
              this.$emit('import-finish')
              return
            }

            this.$store.commit('loadDbModel', model.data)

            this.loading = false
            this.$emit('import-finish')

            const models = await get('models')
            this.$store.commit('updateDbModels', models.data)
          },
          false
        )
        reader.readAsText(file)

        return false
      }
      const form = new FormData()
      form.append('file', file)
      form.append('user_id', user_id)

      model = await post('import-bngl', form)

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
