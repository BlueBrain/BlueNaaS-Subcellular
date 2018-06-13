
<template>
  <main>
  </main>
</template>


<script>
  import store from '@/store';

  export default {
    name: 'main-view',
    mounted() {
      store.$dispatch('loadCircuit');
    },
  };
</script>
