
<template>
  <i-table
    v-if="neuron"
    :columns="columns"
    :data="tableData"
  />
</template>


<script>
  export default {
    name: 'neuron-info-table',
    props: ['neuron'],
    data() {
      return {
        columns: [{
          title: 'Property',
          key: 'prop',
        }, {
          title: 'Value',
          key: 'val',
        }],
      };
    },
    methods: {
      buildTableData() {
        if (!this.neuron) return [];

        return Object.keys(this.neuron)
          .filter(k => !['x', 'y', 'z'].includes(k))
          .reduce((acc, prop) => [...acc, { prop, val: this.neuron[prop] }], []);
      },
    },
    computed: {
      tableData() {
        return this.buildTableData();
      },
    },
  };
</script>
