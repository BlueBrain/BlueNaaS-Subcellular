<template>
  <div v-if="model" class="p-12">
    <h2>Subcellular model: {{ model.name }}</h2>

    <br />

    <p style="font-family: monospace; max-width: 80%; font-size: 16px">{{ model.annotation }}</p>

    <i-button class="mt-12 mr-12" type="primary" :loading="loading" @click="loadModel"> Load </i-button>

    <i-button class="mt-12" type="error" @click="deleteModel" :disabled="model.public || loading"> Delete </i-button>
  </div>
</template>

<script>
export default {
  name: 'db-model',
  data() {
    return { loading: false }
  },
  created() {
    if (!this.model) this.$router.push('/model')
  },
  methods: {
    async loadModel() {
      this.loading = true

      await this.$store.dispatch('loadDbModel', this.model)

      this.loading = false
      this.$store.commit('resetEntitySelection')
      this.$router.go(-1)
    },
    deleteModel() {
      this.$store.dispatch('deleteDbModel', this.model)
    },
  },
  computed: {
    model() {
      return this.$store.state.selectedEntity?.entity
    },
  },
}
</script>
