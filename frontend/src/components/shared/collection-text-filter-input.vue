
<template>
  <i-input
    size="small"
    v-model="searchStr"
    :clearable="true"
    placeholder="Search"
    @on-change="onSearchChange"
  />
</template>


<script>
  import debounce from 'lodash/debounce';

  export default {
    name: 'collection-text-filter-input',
    props: ['value', 'collection', 'filterBy'],
    data() {
      return {
        searchStr: '',
      };
    },
    created() {
      this.onSearchChange = debounce(() => this.filterCollection(), 300);
    },
    methods: {
      filterCollection() {
        if (!this.searchStr) {
          this.$emit('input', this.collection);
          return;
        }

        const filteredCollection = this.collection.filter((collectionElement) => {
          const substr = this.searchStr.toLowerCase();
          return this.filterBy.some(filterProp => collectionElement[filterProp].toLowerCase().includes(substr));
        });
        this.$emit('input', filteredCollection);
      },
    },
    watch: {
      collection() {
        this.filterCollection();
      },
    },
  };
</script>
