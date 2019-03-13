
<template>
  <div class="p-12">
    <h2>Model: {{ model.name }}</h2>

    <br>

    <pre>{{ model.annotation }}</pre>

    <i-button
      class="mt-12 mr-12"
      type="primary"
      @click="loadModel"
    >
      Load
    </i-button>

    <i-button
      class="mt-12"
      type="error"
      @click="deleteModel"
    >
      Delete
    </i-button>
  </div>
</template>


<script>
  export default {
    name: 'db-model',
    methods: {
      loadModel() {
        const { model } = this;
        this.$store.commit('resetEntitySelection');
        this.$store.dispatch('loadDbModel', model);
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
