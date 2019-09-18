
<template>
  <div class="p-12">
    <h2>Subcellular model: {{ model.name }}</h2>

    <br>

    <pre>{{ model.annotation }}</pre>

    <i-button
      class="mt-12 mr-12"
      type="primary"
      :loading="loading"
      @click="loadModel"
    >
      Load
    </i-button>

    <i-button
      class="mt-12"
      type="error"
      @click="deleteModel"
      :disabled="model.public || loading"
    >
      Delete
    </i-button>
  </div>
</template>


<script>
  export default {
    name: 'db-model',
    data() {
      return { loading: false };
    },
    methods: {
      async loadModel() {
        const { model } = this;
        this.$store.commit('resetEntitySelection');
        this.loading = true;
        await this.$store.dispatch('loadDbModel', model);
        this.loading = false;
        this.$router.push('/model/meta');
      },
      deleteModel() {
        this.$store.dispatch('deleteDbModel', this.model);
      },
    },
    computed: {
      model() {
        return this.$store.state.selectedEntity.entity;
      },
    },
  };
</script>
