
<template>
  <div class="h-100 o-scroll-y">
    <i-menu
      name="main-menu"
      width="auto"
      theme="light"
      :active-name="currentEntityType"
      :open-names="['physiology']"
      @on-select="onEntityTypeSelect"
    >
      <MenuItem name="meta">
        Model
        <Badge class="float-right" status="success" />
      </MenuItem>
      <Submenu name="physiology">
        <template slot="title">
          Physiology
        </template>

        <MenuItem name="structures">
          Structures
          <strong v-if="model.structures.length">({{ model.structures.length }})</strong>
          <span v-else>(0)</span>
        </MenuItem>

        <MenuItem name="parameters">
          Parameters
          <strong v-if="model.parameters.length">({{ model.parameters.length }})</strong>
          <span v-else>(0)</span>
        </MenuItem>

        <MenuItem name="functions">
          Functions
          <strong v-if="model.functions.length">({{ model.functions.length }})</strong>
          <span v-else>(0)</span>
        </MenuItem>

        <MenuItem name="molecules">
          Molecules
          <strong v-if="model.molecules.length">({{ model.molecules.length }})</strong>
          <span v-else>(0)</span>
        </MenuItem>

        <MenuItem name="species">
          Species
          <strong v-if="model.species.length">({{ model.species.length }})</strong>
          <span v-else>(0)</span>
        </MenuItem>

        <MenuItem name="observables">
          Observables
          <strong v-if="model.observables.length">({{ model.observables.length }})</strong>
          <span v-else>(0)</span>
        </MenuItem>

        <MenuItem name="reactions">
          Reactions
          <strong v-if="model.reactions.length">({{ model.reactions.length }})</strong>
          <span v-else>(0)</span>
        </MenuItem>

        <MenuItem name="diffusions">
          Diffusions
          <strong v-if="model.diffusions.length">({{ model.diffusions.length }})</strong>
          <span v-else>(0)</span>
        </MenuItem>

      </Submenu>
      <MenuItem name="geometry">
        Geometry
      </MenuItem>

      <MenuItem name="simulations">
        Simulations
        <strong v-if="model.simulations.length">({{ model.simulations.length }})</strong>
        <span v-else>(0)</span>
      </MenuItem>
    </i-menu>
  </div>
</template>


<script>
  export default {
    name: 'model-menu',
    methods: {
      onEntityTypeSelect(entityType) {
        this.$store.commit('resetEntitySelection');
        const path = `/model/${entityType}`;
        if (path !== this.$router.currentRoute.path) {
          this.$router.push({ path });
        }
      },
    },
    computed: {
      model() {
        return this.$store.state.model;
      },
      currentEntityType() {
        return this.$route.path.split('/')[2];
      },
    },
  };
</script>


<style lang="scss" scoped>
  .ivu-menu-vertical .ivu-menu-item, .ivu-menu-vertical .ivu-menu-submenu-title {
    padding-top: 6px;
    padding-bottom: 6px;
  }
</style>
