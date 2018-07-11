
<template>
  <transition name="fade">
    <div
      class="hover-object-info-container"
      v-if="content"
    >
      <h4>{{ content.header }}</h4>
      <div
        v-if="content"
        v-for="(item, index) in content.items"
        :key="index"
      >
        <h5 v-if="item.subHeader">
          {{ item.subHeader }}
        </h5>
        <div v-if="item.type === 'text'">
          <p>{{ item.data }}</p>
        </div>
        <div v-else-if="item.type === 'table'">
          <table>
            <tr
              v-for="(val, key) in item.data"
              :key="key"
            >
              <td>{{ key }}</td>
              <td>{{ val }}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </transition>
</template>


<script>
  import store from '@/store';

  export default {
    name: 'hover-object-info',
    data() {
      return {
        content: null,
      };
    },
    mounted() {
      store.$on('showHoverObjectInfo', (content) => { this.content = content; });
      store.$on('hideHoverObjectInfo', () => { this.content = null; });
    },
  };
</script>


<style lang="scss" scoped>
  .hover-object-info-container {
    padding: 6px;
    background-color: white;
    border: 1px solid #dddee1;
    border-radius: 4px;
    height: 212px;
    width: 240px;
    line-height: 18px;
  }

  table {
    width: 100%;
  }
</style>
