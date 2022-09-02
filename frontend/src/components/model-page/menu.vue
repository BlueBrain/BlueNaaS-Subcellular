<template>
  <div class="h-100 o-scroll-y">
    <i-menu
      name="main-menu"
      width="auto"
      theme="light"
      :active-name="selected"
      :open-names="['physiology']"
      @on-select="onSelect"
    >
      <MenuItem name="meta">
        Model
        <Badge class="float-right" status="success" />
      </MenuItem>
      <Submenu name="physiology">
        <template slot="title"> Physiology </template>

        <MenuItem name="structures"> Structures </MenuItem>

        <MenuItem name="parameters"> Parameters </MenuItem>

        <MenuItem name="functions"> Functions </MenuItem>

        <MenuItem name="molecules"> Molecules </MenuItem>

        <MenuItem name="species"> Species </MenuItem>

        <MenuItem name="observables"> Observables </MenuItem>

        <MenuItem name="reactions"> Reactions </MenuItem>

        <MenuItem name="diffusions"> Diffusions </MenuItem>
      </Submenu>
      <MenuItem name="geometry"> Geometry </MenuItem>

      <MenuItem name="simulations"> Simulations </MenuItem>

      <MenuItem name="viz"> Visualizations</MenuItem>
    </i-menu>
  </div>
</template>

<script lang="ts">
export default {
  name: 'model-menu',
  methods: {
    onSelect(path: string) {
      this.$router.push({ path })
    },
  },
  computed: {
    model() {
      return this.$store.state.model
    },
    selected() {
      return this.$route.path.split('/')[1]
    },
  },
}
</script>

<style lang="scss" scoped>
.ivu-menu-vertical .ivu-menu-item,
.ivu-menu-vertical .ivu-menu-submenu-title {
  padding-top: 6px;
  padding-bottom: 6px;
}
</style>
