<template>
  <div class="p-12 h-100 o-scroll-y">
    <h2>Subcellular model: {{ name || 'unnamed' }}</h2>

    <i-form class="mt-12" :label-width="100" @submit.native.prevent="saveModel">
      <FormItem label="Name *">
        <i-input ref="nameInput" size="small" v-model="name" />
      </FormItem>
      <FormItem label="Annotation">
        <i-input size="small" type="textarea" :rows="8" v-model="annotation" />
      </FormItem>
      <FormItem>
        <i-button type="warning" @click="clearModel"> Clear model </i-button>
        <i-button
          type="primary"
          class="ml-12 width-82"
          :loading="saveInProgress"
          :disabled="!saveBtnAvailable"
          @click="saveModel"
        >
          {{ saveBtnLabel }}
        </i-button>
        <i-button :disabled="!modelId" class="ml-12" @click="cloneModel"> Clone </i-button>
        <i-button class="ml-12 width-82" type="default" @click="showImportModal"> Import </i-button>
        <Dropdown trigger="click" :transfer="true" @on-click="exportModel">
          <i-button type="primary" class="ml-12 width-82" :disabled="!modelId">
            Export
            <Icon type="ios-arrow-down"></Icon>
          </i-button>
          <DropdownMenu slot="list">
            <DropdownItem name="bngl">BNGL</DropdownItem>
            <!-- <DropdownItem name="ebngl" disabled>eBNGL</DropdownItem>
            <DropdownItem name="pysb_flat" disabled>PySB</DropdownItem>
            <DropdownItem name="sbml" disabled>SBML</DropdownItem> -->
          </DropdownMenu>
        </Dropdown>
        <i-button
          class="ml-12 width-82"
          type="error"
          @click="deleteModel"
          :disabled="!modelId || $store.state.model.user_id === pid"
        >
          Delete
        </i-button>
      </FormItem>
    </i-form>

    <Modal title="Model import" v-model="importModalVisible" class-name="vertical-center-modal" :footer-hide="true">
      <model-import @import-finish="onImportFinished" />
    </Modal>
  </div>
</template>

<script lang="ts">
import ModelImport from '@/components/shared/model-import.vue'
import { post, patch, get, del } from '@/services/api'
import { AxiosResponse } from 'axios'
import { ModelBase } from '@/types'
import { PUBLIC_USER_ID } from '@/constants'
import saveAs from 'file-saver'

export default {
  name: 'model-meta',
  components: {
    'model-import': ModelImport,
  },
  data() {
    return {
      pid: PUBLIC_USER_ID,
      importModalVisible: false,
      saveInProgress: false,
      saveBtnLabel: 'Save',
    }
  },
  methods: {
    clearModel() {
      this.$store.commit('loadDbModel', {})
    },
    async cloneModel() {
      if (!this.modelId) return
      const res = await post('clone-model', { model_id: this.modelId })
      this.$store.commit('loadDbModel', res.data)

      this.getModels()
    },
    async saveModel() {
      this.saveInProgress = true
      this.saveBtnLabel = 'Saving'

      const model = this.$store.state.model

      let modelRes: AxiosResponse<ModelBase>

      if (!model?.id || model?.user_id === PUBLIC_USER_ID)
        modelRes = await post('models', { name: this.name, annotation: this.annotation })
      else modelRes = await patch(`models/${model.id}`, { name: this.name, annotation: this.annotation })

      this.$store.commit('loadDbModel', modelRes.data)

      this.saveBtnLabel = 'Saved!'
      this.saveBtnLabel = 'Save'
      this.saveInProgress = false

      this.getModels()
    },

    async getModels() {
      const models = await get('models')
      this.$store.commit('updateDbModels', models.data)
    },

    async deleteModel() {
      if (!this.modelId) return
      const res = await del(`models/${this.modelId}`)
      if (res.status == 200) {
        this.getModels()
        this.clearModel()
      }
    },

    async exportModel() {
      let res: AxiosResponse<string> | undefined

      if (this.modelId) res = await get(`export-model/${this.modelId}`)

      if (!res)
        this.$Notice.error({
          title: 'Export error',
        })
      else saveAs(new Blob([res.data]), `${this.name}.bngl`)
    },
    showImportModal() {
      this.importModalVisible = true
    },
    onImportFinished() {
      this.importModalVisible = false
    },
  },
  computed: {
    modelId() {
      return this.$store.state.model?.id
    },

    name: {
      get() {
        return this.$store.state.model.name
      },
      set(name) {
        this.$store.commit('updateModelName', name)
      },
    },
    annotation: {
      get() {
        return this.$store.state.model.annotation
      },
      set(annotation) {
        this.$store.commit('updateModelAnnotation', annotation)
      },
    },
    saveBtnAvailable() {
      return !!this.name
    },
  },
}
</script>

<style lang="scss" scoped>
.width-82 {
  width: 82px;
}
</style>
