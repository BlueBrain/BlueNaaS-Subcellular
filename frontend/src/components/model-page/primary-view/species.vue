
<template>
  <div class="h-100 pos-relative o-hidden">

    <div class="block-head">
      <h3>Species</h3>
    </div>

    <div class="block-main" ref="mainBlock">
      <i-table
        highlight-row
        :no-data-text="emptyTableText"
        :height="tableHeight"
        :columns="columns"
        :data="filteredSpecies"
        @on-row-click="onSpeciesSelect"
      />
    </div>

    <div class="block-footer">
      <Row>
        <i-col span="12">
          <i-button
            type="primary"
            @click="addSpecies"
          >
            New Species
          </i-button>
          <i-button
            class="ml-24"
            type="warning"
            :disabled="removeBtnDisabled"
            @click="removeSpecies"
          >
            Delete
          </i-button>
        </i-col>
        <i-col span="12">
          <i-input
            search
            v-model="searchStr"
            placeholder="Search"
          />
        </i-col>
      </Row>
    </div>

    <Modal
      v-model="newSpeciesModalVisible"
      title="New Species"
      class-name="vertical-center-modal"
      @on-ok="onOk"
    >
      <species-form
        ref="speciesForm"
        v-model="newSpecies"
      />
      <div slot="footer">
        <i-button
          class="mr-6"
          type="text"
          @click="hideNewSpeciesModal"
        >
          Cancel
        </i-button>
        <i-button
          type="primary"
          :disabled="!newSpecies.valid"
          @click="onOk"
        >
          OK
        </i-button>
      </div>
    </Modal>

  </div>
</template>


<script>
  import get from 'lodash/get';
  import { mapState } from 'vuex';

  import bus from '@/services/event-bus';

  import BnglInput from '@/components/shared/bngl-input.vue';
  import SpeciesForm from '@/components/shared/entities/species-form.vue';

  import findUniqName from '@/tools/find-uniq-name';
  import objStrSearchFilter from '@/tools/obj-str-search-filter';
  import blockHeightWoPadding from '@/tools/block-height-wo-padding';

  const defaultSpecies = {
    name: '',
    valid: false,
    definition: '',
    concentration: '',
    annotation: '',
  };


  export default {
    name: 'species-component',
    components: {
      'species-form': SpeciesForm,
    },
    data() {
      return {
        searchStr: '',
        tableHeight: null,
        newSpeciesModalVisible: false,
        newSpecies: Object.assign({}, defaultSpecies),
        columns: [{
          title: 'Name',
          key: 'name',
          maxWidth: 120,
        }, {
          title: 'Concentration',
          maxWidth: 220,
          render: (h, params) => h(BnglInput, {
            props: {
              entityType: 'parameter',
              readOnly: true,
              value: params.row.concentration,
            },
          }),
        }, {
          title: 'BioNetGen definition',
          render: (h, params) => h(BnglInput, {
            props: {
              entityType: 'species',
              readOnly: true,
              value: params.row.definition,
            },
          }),
        }, {
          title: 'Annotation',
          maxWidth: 260,
          render: (h, params) => h('span', params.row.annotation.split('\n')[0]),
        }],
      };
    },
    mounted() {
      this.$nextTick(() => this.$nextTick(() => this.computeTableHeight(), 0));
      bus.$on('layoutChange', () => this.computeTableHeight());
    },
    beforeDestroy() {
      bus.$off('layoutChange');
    },
    methods: {
      addSpecies() {
        this.newSpecies = Object.assign({}, defaultSpecies, { name: findUniqName(this.species, 's') });
        this.showNewSpeciesModal();

        this.$nextTick(() => {
          this.$refs.speciesForm.refresh();
          this.$refs.speciesForm.focus();
        });
      },
      showNewSpeciesModal() {
        this.newSpeciesModalVisible = true;
      },
      hideNewSpeciesModal() {
        this.newSpeciesModalVisible = false;
      },
      removeSpecies() {
        this.$store.commit('removeSelectedEntity');
      },
      onSpeciesSelect(species, index) {
        this.$store.commit('setEntitySelection', { index, type: 'species', entity: species });
      },
      onOk() {
        this.newSpeciesModalVisible = false;
        this.$store.commit('addSpecies', this.newSpecies);
      },
      computeTableHeight() {
        this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock);
      },
    },
    computed: mapState({
      species(state) {
        return state.model.species;
      },
      filteredSpecies() {
        return this.species.filter(e => objStrSearchFilter(this.searchStr, e, ['name', 'definition']));
      },
      emptyTableText() {
        return this.searchStr ? 'No matching species' : 'Create a species by using buttons below';
      },
      removeBtnDisabled: state => get(state, 'selectedEntity.type') !== 'species',
    }),
  };
</script>
