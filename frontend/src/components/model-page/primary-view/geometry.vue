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

      this.saveNodeFile()
      this.saveEleFile()
      this.saveFaceFile()
    },

    saveNodeFile() {
      const scaledNodes = this.geometry.nodes.map((n) => n / this.geometry.scale)

      const nodes = []

      for (let i = 0; i <= scaledNodes.length - 3; i += 3) {
        nodes.push(scaledNodes.slice(i, i + 3))
      }

      const nFile =
        `\t${nodes.length}\t3\t0\t0\n` + nodes.map((n, i) => `\t${i + 1}\t${n[0]}\t${n[1]}\t${n[2]}`).join('\n')

      saveAs(new Blob([nFile]), `${this.geometry.name}.node`)
    },

    saveEleFile() {
      const eles = []

      for (let i = 0; i <= this.geometry.tets.length - 4; i += 4) {
        eles.push(this.geometry.tets.slice(i, i + 4))
      }

      const nFile =
        `\t${eles.length}\t4\t0\n` +
        eles.map((n, i) => `\t${i + 1}\t${n[0] + 1}\t${n[1] + 1}\t${n[2] + 1}\t${n[3] + 1}`).join('\n')

      saveAs(new Blob([nFile]), `${this.geometry.name}.ele`)
    },

    saveFaceFile() {
      const eles = []

      for (let i = 0; i <= this.geometry.tris.length - 3; i += 3) {
        eles.push(this.geometry.tris.slice(i, i + 3))
      }

      const nFile =
        `\t${eles.length}\t0\n` + eles.map((n, i) => `\t${i + 1}\t${n[0] + 1}\t${n[1] + 1}\t${n[2] + 1}`).join('\n')

      saveAs(new Blob([nFile]), `${this.geometry.name}.face`)
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
