
<template>
  <div class="app-container">
    <header-component/>
    <main-view/>
    <footer-component/>
    <spinner-component/>
  </div>
</template>


<script>
  import './styles.scss';
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
