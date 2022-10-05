<template>
  <div class="h-100 pos-relative o-hidden">
    <div class="block-head">
      <h3>Geometry</h3>
    </div>
    <div class="block-main">
      <div v-if="this.$store.state.model.id && !loading" class="block-main-inner p-12">
        <div v-if="geometry" class="h-100">
          <div>{{ geometry.name }}</div>
          <p>{{ geometry.annotation }}</p>
          <br />
          <div class="geometry-viewer-container" style="height: 90%">
            <geometry-viewer v-if="geometry" :geometry-data="geometry" />
          </div>
        </div>

        <div v-else>
          <new-geometry-form ref="newGeometryForm" v-model="geometry" />
        </div>
      </div>
      <div v-else>Load a model to view / edit its geometry</div>
    </div>
    <div class="block-footer">
      <i-button v-if="geometry" type="warning" @click="removeGeometry" :disabled="isPublicModel">
        Remove geometry
      </i-button>
      <i-button v-if="geometry" type="primary" @click="downloadGeometry" style="margin-left: 10px"> Download </i-button>
    </div>
  </div>
</template>

<script lang="ts">
import NewGeometryForm from '@/components/shared/new-geometry-form.vue'
import GeometryViewer from '@/components/shared/geometry-viewer.vue'
import { get, patch } from '@/services/api'
import { PUBLIC_USER_ID } from '@/constants'
import saveAs from 'file-saver'

export default {
  name: 'geometry-component',
  components: {
    'new-geometry-form': NewGeometryForm,
    'geometry-viewer': GeometryViewer,
  },
  data() {
    return {
      geometry: null,
      modelVisible: false,
      newModelGeometry: null,
      saving: false,
      loading: true,
    }
  },
  created() {
    this.getGeometry()
  },
  methods: {
    async getModels() {
      const models = await get('models')
      this.$store.commit('updateDbModels', models.data)
    },
    async getGeometry() {
      this.loading = true
      if (this.model.geometry_id)
        this.geometry = (
          await get(`geometries/${this.model.geometry_id}`, {
            user_id: this.model.user_id,
          })
        ).data
      else {
        this.geometry = null
      }

      this.loading = false
    },
    async removeGeometry() {
      if (!this.geometry || !this.model?.id) return
      const res = await patch(`models/${this.model.id}`, { geometry_id: null })
      if (res.status === 200) {
        this.geometry = null
        this.$store.commit('loadDbModel', res.data)
        this.getModels()
      }
    },

    downloadGeometry() {
      if (!this.geometry) return
      const geometry = {
        scale: this.geometry.scale,
        freeDiffusionBoundaries: [],
        structures: this.geometry.structures.map((s) => ({ name: s.name, type: s.type, idxs: s.idxs })),
      }

      saveAs(new Blob([JSON.stringify(geometry)]), `${this.geometry.name}.json`)
    },
  },
  computed: {
    model() {
      return this.$store.state.model
    },
    isPublicModel() {
      return this.model?.user_id === PUBLIC_USER_ID
    },
  },
  watch: {
    model() {
      this.getGeometry()
    },
  },
}
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
