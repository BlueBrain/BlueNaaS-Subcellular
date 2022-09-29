<template>
  <div class="h-100 position-relative o-scroll-y">
    <div class="block-head">
      <h3>Subcellular models repository</h3>
    </div>

    <div class="block-main p-12">
      <i-input placeholder="model search" search />
      <Tree :data="dbData" @on-select-change="onSelectChange" />
    </div>

    <!-- <div class="block-footer">
      <i-button class="mb-12" type="primary" long to="/molecular-repo"> Open molecular repository </i-button>
    </div> -->
  </div>
</template>

<script lang="ts">
import get from 'lodash/get'
import * as api from '@/services/api'
import { ModelBase } from '@/types'

export default {
  name: 'db-component',

  async created() {
    const res = await api.getPublicModels<ModelBase[]>()

    const myModelsRes = await api.get<ModelBase[]>('models')

    if (myModelsRes) this.$store.commit('updateDbModels', myModelsRes.data)
    this.dbData[1].children = res.data.map(this.model)
  },
  data() {
    return {
      publicModels: [],
      dbData: [
        {
          title: 'My models',
          expand: true,
          children: [],
        },
        {
          title: 'Public models',
          expand: false,
          children: [],
        },
      ],
    }
  },
  methods: {
    model(model: ModelBase) {
      return {
        title: model.name,
        type: 'model',
        model,
      }
    },
    onSelectChange(nodeArray) {
      if (get(nodeArray, '[0].type') !== 'model') return
      this.$store.commit('loadDbModel', nodeArray[0].model)
    },
  },
  computed: {
    dbModels() {
      return this.$store.state.dbModels
    },
  },
  watch: {
    dbModels(models: ModelBase[]) {
      this.dbData[0].children = models.map((model) => ({
        title: model.name,
        type: 'model',
        model,
      }))
    },
  },
}
</script>

<style lang="scss" scoped>
.block-db-footer {
  position: absolute;
  height: 84px;
  left: 0;
  bottom: 0;
  width: 100%;
  padding: 12px;
}
</style>
