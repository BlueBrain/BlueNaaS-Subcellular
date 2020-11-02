<template>
  <div>
    <Tabs name="revision-content" :animated="false">
      <TabPane tab="revision-content" :label="getTabLabel(revision.structures, 'Structure types')">
        <revision-entities entity-type="structure" />
      </TabPane>

      <TabPane tab="revision-content" :label="getTabLabel(revision.parameters, 'Parameters')">
        <revision-entities entity-type="parameter" />
      </TabPane>

      <TabPane tab="revision-content" :label="getTabLabel(revision.functions, 'Functions')">
        <revision-entities entity-type="function" />
      </TabPane>

      <TabPane tab="revision-content" :label="getTabLabel(revision.molecules, 'Molecules')">
        <revision-entities entity-type="molecule" />
      </TabPane>

      <TabPane tab="revision-content" :label="getTabLabel(revision.species, 'Species')">
        <revision-entities entity-type="species" />
      </TabPane>

      <TabPane tab="revision-content" :label="getTabLabel(revision.observables, 'Observables')">
        <revision-entities entity-type="observable" />
      </TabPane>

      <TabPane tab="revision-content" :label="getTabLabel(revision.reactions, 'Reactions')">
        <revision-entities entity-type="reaction" />
      </TabPane>

      <TabPane tab="revision-content" :label="getTabLabel(revision.diffusions, 'Diffusions')">
        <revision-entities entity-type="diffusion" />
      </TabPane>
    </Tabs>
  </div>
</template>

<script>
  import constants from '@/constants';
  import RevisionEntities from './revision-content/revision-entities.vue';

  const { validationMessageType: msgType } = constants;

  export default {
    name: 'revision-content',
    components: {
      'revision-entities': RevisionEntities,
    },
    methods: {
      getLabelBadgeStatus(collection) {
        const allValidationMsgs = collection.flatMap((entity) => entity.validationMessages);

        if (!allValidationMsgs.length) return 'success';

        const hasErrors = allValidationMsgs.some((msg) => msg.type === msgType.ERROR);
        if (hasErrors) return 'error';

        const hasWarnings = allValidationMsgs.some((msg) => msg.type === msgType.WARNING);
        if (hasWarnings) return 'warning';

        return 'default';
      },
      getTabLabel(collection, labelText) {
        const status = this.getLabelBadgeStatus(collection);

        return (h) =>
          h('div', [
            h('Badge', { props: { status } }),
            h('span', `${labelText} (${collection.length})`),
          ]);
      },
    },
    computed: {
      revision() {
        return this.$store.state.revision;
      },
    },
  };
</script>
