
<template>
    <div
      class="container"
      v-if="colorPalette"
    >
      <div class="palette-container">
        <div
          class="palette-item"
          v-for="(color, paletteKey) in colorPalette"
          :key="paletteKey"
        >
          <small>{{ paletteKey }}</small>
          <div
            class="color-block"
            :style="{'background-color': color}"
          ></div>
        </div>
      </div>
    </div>
</template>


<script>
  import * as chroma from 'chroma-js';

  import store from '@/store';

  export default {
    name: 'soma-color-palette',
    data() {
      return {
        colorPalette: {},
      };
    },
    mounted() {
      store.$on('updateColorPalette', () => this.updateColorPalette());
    },
    methods: {
      updateColorPalette() {
        const glColorPalette = store.state.circuit.color.palette;
        const colorKeys = Object.keys(glColorPalette).sort();
        this.colorPalette = colorKeys.reduce((palette, colorKey) => {
          const color = chroma.gl(...glColorPalette[colorKey]).css();
          return Object.assign(palette, { [colorKey]: color });
        }, {});
      },
    },
  };
</script>


<style scoped lang="scss">
  .container {
    background-color: #fefdfb;
    padding: 10px;
    position: relative;
  }

  .palette-container {
    margin-top: 3px;
    display: flex;
    flex-wrap: wrap;
    flex: 1 1 100%;
    width: calc(100% - 240px);
    min-height: 24px;
  }

  .palette-item {
    display: flex;
    margin-right: 12px;
    margin-bottom: 6px;
    height: 18px;
    line-height: 18px;
    border: 1px solid #838383;

    small {
      padding: 0 6px;
      min-width: 56px;
    }

    .color-block {
      height: 100%;
      width: 18px;
      display: inline-block;
    }
  }
</style>
