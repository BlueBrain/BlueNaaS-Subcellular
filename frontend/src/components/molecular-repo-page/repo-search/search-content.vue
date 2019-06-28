
<template>
  <div>
    <Tabs
      name="search-content"
      :animated="false"
    >
      <TabPane
        v-if="queryResult.structures.length"
        tab="search-content"
        :label="`Structure types (${queryResult.structures.length})`"
      >
        <search-entities entity-type="structure"/>
      </TabPane>

      <TabPane
        v-if="queryResult.parameters.length"
        tab="search-content"
        :label="`Parameters (${queryResult.parameters.length})`"
      >
        <search-entities entity-type="parameter"/>
      </TabPane>

      <TabPane
        v-if="queryResult.functions.length"
        tab="search-content"
        :label="`Functions (${queryResult.functions.length})`"
      >
        <search-entities entity-type="function"/>
      </TabPane>

      <TabPane
        v-if="queryResult.molecules.length"
        tab="search-content"
        :label="`Molecules (${queryResult.molecules.length})`"
      >
        <search-entities entity-type="molecule"/>
      </TabPane>

      <TabPane
        v-if="queryResult.species.length"
        tab="search-content"
        :label="`Species (${queryResult.species.length})`"
      >
        <search-entities entity-type="species"/>
      </TabPane>

      <TabPane
        v-if="queryResult.observables.length"
        tab="search-content"
        :label="`Observables (${queryResult.observables.length})`"
      >
        <search-entities entity-type="observable"/>
      </TabPane>

      <TabPane
        v-if="queryResult.reactions.length"
        tab="search-content"
        :label="`Reactions (${queryResult.reactions.length})`"
      >
        <search-entities entity-type="reaction"/>
      </TabPane>

      <TabPane
        v-if="queryResult.diffusions.length"
        tab="search-content"
        :label="`Diffusions (${queryResult.diffusions.length})`"
      >
        <search-entities entity-type="diffusion"/>
      </TabPane>
    </Tabs>
  </div>
</template>


<script>
  import SearchEntities from './search-content/search-entities.vue';

  export default {
    name: 'search-content',
    components: {
      'search-entities': SearchEntities,
    },
    computed: {
      queryResult() {
        return this.$store.state.repoQueryResult;
      },
    },
  };
</script>
