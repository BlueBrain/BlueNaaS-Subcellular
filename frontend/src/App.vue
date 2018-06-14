
<template>
  <div class="app-container">
    <header-component/>
    <main-view/>
    <footer-component/>
  </div>
</template>


<script>
  import Header from './components/header.vue';
  import MainView from './components/main-view.vue';
  import Footer from './components/footer.vue';

  export default {
    name: 'app',
    components: {
      'header-component': Header,
      'main-view': MainView,
      'footer-component': Footer,
    },
  };
</script>


<style lang="scss">
  $header-height: 28px;
  $footer-height: 46px;

  $main-height-delta: calc(#{$header-height} + #{$footer-height});

  $main-height: calc(100% - #{$main-height-delta});

  html {
    overflow: hidden;
    height: 100%;
  }

  body {
    height: 100%;
    overflow: auto;
  }

  .app-container {
    height: 100%;
  }

  header {
    height: $header-height;
    line-height: $header-height;
    background-color: #495060;
    color: #fff;
  }

  footer {
    height: $footer-height;
    line-height: $footer-height;
    background-color: #f8f8f9;
    border-top: 1px solid #dddee1;
  }

  header, footer {
    position: relative;
    padding: 0 6px;
  }

  main {
    height: $main-height;
  }
</style>
