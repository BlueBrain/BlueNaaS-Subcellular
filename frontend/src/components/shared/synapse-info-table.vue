
<template>
  <i-table
    v-if="synapse"
    :columns="columns"
    :data="tableData"
  />
</template>


<script>
  import normalizeNumber from './../../filters/normalize-number';

  const hiddenSynapseProps = ['postXCenter', 'postYCenter', 'postZCenter', 'index', 'visible', 'gid'];

  export default {
    name: 'synapse-info-table',
    props: ['synapse'],
    data() {
      return {
        tableVisible: false,
        columns: [{
          title: 'Property',
          key: 'prop',
        }, {
          title: 'Value',
          key: 'val',
        }],
      };
    },
    computed: {
      tableData() {
        return this.buildTableData();
      },
    },
    methods: {
      buildTableData() {
        if (!this.synapse) return [];

        return Object.keys(this.synapse)
          .filter(p => !hiddenSynapseProps.includes(p))
          .reduce((acc, prop) => [...acc, { prop, val: normalizeNumber(this.synapse[prop]) }], []);
      },
    },
  };
</script>
