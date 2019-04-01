
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
  import './server-events';

  import bus from './services/event-bus';

  import Header from './components/header.vue';
  import Footer from './components/footer.vue';


  export default {
    name: 'app',
    components: {
      'header-component': Header,
      'footer-component': Footer,
    },
    mounted() {
      this.$store.dispatch('init');
      window.addEventListener('resize', () => bus.$emit('layoutChange'));
    },
  };
</script>
