<template>
  <div class="p-24">
    <i-button class="mb-12" type="dashed" @click="goBack">
      <Icon type="ios-arrow-back" />
      Model page ({{ modelName || 'unnamed' }})
    </i-button>

    <h2>Molecular repository</h2>

    <Tabs class="mt-24" name="molecular-repo" type="card" :animated="false">
      <TabPane label="Search" tab="molecular-repo" class="pl-12 pr-12">
        <search-tab />
      </TabPane>

      <TabPane label="Revision editor" tab="molecular-repo" class="pl-12 pr-12">
        <revision-editor />
      </TabPane>
    </Tabs>
  </div>
</template>

<script>
import RepoSearch from './molecular-repo-page/repo-search.vue'
import RevisionEditor from './molecular-repo-page/revision-editor.vue'

export default {
  name: 'molecular-repo-page',
  components: {
    'search-tab': RepoSearch,
    'revision-editor': RevisionEditor,
  },
  methods: {
    goBack() {
      if (window.history.length) {
        this.$router.go(-1)
      } else {
        this.$router.push({ path: '/model-meta' })
      }
    },
  },
  computed: {
    modelName() {
      return this.$store.state.model.name
    },
  },
}
</script>
