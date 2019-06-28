
<template>
  <div>
    <Tabs
      name="revision-content"
      :animated="false"
    >
      <TabPane
        tab="revision-content"
        :label="`Structure types (${revision.structures.length})`"
      >
        <revision-entities entity-type="structure"/>
      </TabPane>

      <TabPane
        tab="revision-content"
        :label="`Parameters (${revision.parameters.length})`"
      >
        <revision-entities entity-type="parameter"/>
      </TabPane>

      <TabPane
        tab="revision-content"
        :label="`Functions (${revision.functions.length})`"
      >
        <revision-entities entity-type="function"/>
      </TabPane>

      <TabPane
        tab="revision-content"
        :label="`Molecules (${revision.molecules.length})`"
      >
        <revision-entities entity-type="molecule"/>
      </TabPane>

      <TabPane
        tab="revision-content"
        :label="`Species (${revision.species.length})`"
      >
        <revision-entities entity-type="species"/>
      </TabPane>

      <TabPane
        tab="revision-content"
        :label="`Observables (${revision.observables.length})`"
      >
        <revision-entities entity-type="observable"/>
      </TabPane>

      <TabPane
        tab="revision-content"
        :label="`Reactions (${revision.reactions.length})`"
      >
        <revision-entities entity-type="reaction"/>
      </TabPane>

      <TabPane
        tab="revision-content"
        :label="`Diffusions (${revision.diffusions.length})`"
      >
        <revision-entities entity-type="diffusion"/>
      </TabPane>
    </Tabs>
  </div>
</template>


<script>
  import RevisionEntities from './revision-content/revision-entities.vue';

  export default {
    name: 'revision-content',
    components: {
      'revision-entities': RevisionEntities,
    },
    computed: {
      revision() {
        return this.$store.state.revision;
      },
    },
  };
</script>
