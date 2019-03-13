
<template>
  <div class="h-100">
    <header-component/>
    <main>
      <router-view></router-view>
    </main>
    <footer-component/>
  </div>
</template>


<script>
  import './styles.scss';
  import Header from './components/header.vue';
  import Footer from './components/footer.vue';


  export default {
    name: 'app',
    components: {
      'header-component': Header,
      'footer-component': Footer,
    },
  };
</script>
