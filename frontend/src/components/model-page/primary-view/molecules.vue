
<template>
  <div class="h-100 pos-relative o-hidden">

    <div class="block-head">
      <h3>Molecules</h3>
    </div>

    <div class="block-main" ref="mainBlock">
      <i-table
        highlight-row
        :no-data-text="emptyTableText"
        :height="tableHeight"
        :columns="columns"
        :data="filteredMolecules"
        @on-current-change="onMoleculeSelect"
      />
    </div>

    <div class="block-footer">
      <Row>
        <i-col span="12">
          <i-button
            type="primary"
            @click="addEntity"
          >
            New Molecule
          </i-button>
          <i-button
            class="ml-24"
            type="warning"
            :disabled="removeBtnDisabled"
            @click="removeMolecule"
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
      v-model="newMoleculeModalVisible"
      title="New Molecule"
      class-name="vertical-center-modal"
      @on-ok="onOk"
    >
      <molecule-form
        ref="moleculeForm"
        v-model="newMolecule"
      />
      <div slot="footer">
        <i-button
          class="mr-6"
          type="text"
          @click="hideNewMoleculeModal"
        >
          Cancel
        </i-button>
        <i-button
          type="primary"
          :disabled="!newMolecule.valid"
          @click="onOk"
        >
          OK
        </i-button>
      </div>
    </Modal>

  </div>
</template>


<script>
  import { mapState } from 'vuex';
  import get from 'lodash/get';

  import bus from '@/services/event-bus';

  import BnglInput from '@/components/shared/bngl-input.vue';
  import MoleculeForm from '@/components/shared/entities/molecule-form.vue';

  import findUniqName from '@/tools/find-uniq-name';
  import objStrSearchFilter from '@/tools/obj-str-search-filter';
  import blockHeightWoPadding from '@/tools/block-height-wo-padding';

  const defaultMolecule = {
    name: '',
    valid: false,
    definition: '',
    annotation: '',
  };


  export default {
    name: 'molecules-component',
    components: {
      'molecule-form': MoleculeForm,
    },
    data() {
      return {
        searchStr: '',
        tableHeight: null,
        newMoleculeModalVisible: false,
        newMolecule: Object.assign({}, defaultMolecule),
        columns: [{
          title: 'Name',
          key: 'name',
          maxWidth: 400,
        }, {
          title: 'BioNetGen definition',
          render: (h, params) => h(BnglInput, {
            props: {
              entityType: 'molecule',
              readOnly: true,
              value: params.row.definition,
            },
          }),
        }, {
          title: 'Annotation',
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
      addEntity() {
        this.newMolecule = Object.assign({}, defaultMolecule, { name: findUniqName(this.molecules, 'mt') });
        this.showNewMoleculeModal();


        this.$nextTick(() => {
          this.$refs.moleculeForm.refresh();
          this.$refs.moleculeForm.focus();
        });
      },
      showNewMoleculeModal() {
        this.newMoleculeModalVisible = true;
      },
      hideNewMoleculeModal() {
        this.newMoleculeModalVisible = false;
      },
      removeMolecule() {
        this.$store.commit('removeSelectedEntity');
      },
      onMoleculeSelect(molecule) {
        this.$store.commit('setEntitySelection', { type: 'molecule', entity: molecule });
      },
      onOk() {
        this.hideNewMoleculeModal();
        this.$store.commit('addMolecule', this.newMolecule);
      },
      computeTableHeight() {
        this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock);
      },
    },
    computed: mapState({
      molecules(state) {
        return state.model.molecules;
      },
      filteredMolecules() {
        return this.molecules.filter(e => objStrSearchFilter(this.searchStr, e, ['name', 'definition']));
      },
      emptyTableText() {
        return this.searchStr ? 'No matching molecules' : 'Create a molecule by using buttons below';
      },
      removeBtnDisabled: state => get(state, 'selectedEntity.type') !== 'molecule',
    }),
  };
</script>