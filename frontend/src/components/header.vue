
<template>
  <header>
    <div class="title">
      Subcellular app: {{ circuitName }}
    </div>
  </header>
</template>


<script>
  const circuitName = process.env.VUE_APP_CIRCUIT_NAME;

  export default {
    name: 'header-component',
    data() {
      return { circuitName };
    },
  };
</script>
