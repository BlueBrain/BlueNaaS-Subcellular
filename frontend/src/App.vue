
<template>
  <div class="app-container">
    <header-component/>
    <main-view/>
    <footer-component/>
    <spinner-component/>
  </div>
</template>


<script>
  import Header from './components/header.vue';
  import MainView from './components/main-view.vue';
  import Footer from './components/footer.vue';
  import Spinner from './components/spinner.vue';

  export default {
    name: 'app',
    components: {
      'header-component': Header,
      'main-view': MainView,
      'footer-component': Footer,
      'spinner-component': Spinner,
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
    min-height: $footer-height;
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
    display: flex;
    width: 100%;
  }

  .tabs-header--hidden .ivu-tabs-nav-wrap {
    display: none;
  }

  .mt-6 { margin-top: 6px; }
  .mb-6 { margin-bottom: 6px; }
  .ml-6 { margin-left: 6px; }
  .mr-6 { margin-right: 6px; }

  .mt-12 { margin-top: 12px; }
  .mb-12 { margin-bottom: 12px; }
  .ml-12 { margin-left: 12px; }
  .mr-12 { margin-right: 12px; }

  .p-6 { padding: 6px; }
  .p-12 { padding: 12px; }

  .ivu-table td, .ivu-table th {
    height: 24px;
  }

  .ivu-input-number {
    width: 100%;
  }

  .text-right {
    text-align: right;
  }

  .text-ellipsis {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
