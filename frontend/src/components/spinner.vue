
<template></template>


<script>
  import store from '@/store';

  export default {
    name: 'spinner',
    mounted() {
      store.$on('showGlobalSpinner', (msg) => {
        const config = {};

        if (msg) {
          config.render = h => h('div', [
            h('Icon', {
              class: 'spin-icon-load',
              props: { type: 'load-c', size: 18 },
            }),
            h('div', msg),
          ]);
        }

        this.$Spin.show(config);
      });
      store.$on('hideGlobalSpinner', () => this.$Spin.hide());
    },
  };
</script>


<style>
    .spin-icon-load{
        animation: spin-animation 1s linear infinite;
    }

    @keyframes spin-animation {
        from { transform: rotate(0deg);}
        50%  { transform: rotate(180deg);}
        to   { transform: rotate(360deg);}
    }

</style>
