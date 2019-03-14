
<template>
  <div class="h-100 pos-relative o-hidden">

    <div class="block-head">
      <h3>Structures</h3>
    </div>

    <div class="block-main" ref="mainBlock">
      <i-table
        highlight-row
        :no-data-text="emptyTableText"
        :height="tableHeight"
        :columns="columns"
        :data="filteredStructures"
        @on-current-change="onStructureSelect"
      />
    </div>

    <div class="block-footer">
      <Row>
        <i-col span="12">
          <i-button
            type="primary"
            @click="addStructure"
          >
            New Structure
          </i-button>
          <i-button
            class="ml-24"
            type="warning"
            :disabled="removeBtnDisabled"
            @click="removeStructure"
          >
            Delete
          </i-button>
          <Checkbox
            class="ml-24"
            v-model="nonBnglStructures"
          >
            Non compliant BNGL structures
          </Checkbox>
          (?)
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
      v-model="newStructureModalVisible"
      title="New Molecule"
      class-name="vertical-center-modal"
      @on-ok="onNewStructureOk"
    >
      <structure-form
        ref="structureForm"
        v-model="newStructure"
        @on-submit="onNewStructureOk"
      />
      <div slot="footer">
        <i-button
          class="mr-6"
          type="text"
          @click="hideNewStructureModal"
        >
          Cancel
        </i-button>
        <i-button
          type="primary"
          :disabled="!newStructure.valid"
          @click="onNewStructureOk"
        >
          OK
        </i-button>
      </div>
    </Modal>
  </div>
</template>


<script>
  import get from 'lodash/get';

  import bus from '@/services/event-bus';

  import constants from '@/constants';
  import objStrSearchFilter from '@/tools/obj-str-search-filter';
  import findUniqName from '@/tools/find-uniq-name';
  import blockHeightWoPadding from '@/tools/block-height-wo-padding';

  import StructureForm from '@/components/shared/entities/structure-form.vue';
  import BnglInput from '@/components/shared/bngl-input.vue';

  const { StructureType } = constants;

  const defaultStructure = {
    name: '',
    valid: false,
    type: StructureType.COMPARTMENT,
    parentName: '-',
    size: '',
    annotation: '',
  };


  export default {
    name: 'structures-component',
    components: {
      'structure-form': StructureForm,
    },
    data() {
      return {
        searchStr: '',
        tableHeight: null,
        newStructureModalVisible: false,
        newStructure: Object.assign({}, defaultStructure),
        columns: [{
          title: 'Name',
          key: 'name',
        }, {
          title: 'Type',
          key: 'type',
        }, {
          title: 'Parent',
          key: 'parentName',
        }, {
          title: 'Size',
          render: (h, params) => h(BnglInput, {
            props: {
              entityType: 'parameter',
              readOnly: true,
              value: params.row.size,
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
      addStructure() {
        this.newStructure = Object.assign({}, defaultStructure, { name: findUniqName(this.structures, 'ST') });
        this.showNewStructureModal();

        this.$nextTick(() => {
          this.$refs.structureForm.refresh();
          this.$refs.structureForm.focus();
        });
      },
      showNewStructureModal() {
        this.newStructureModalVisible = true;
      },
      hideNewStructureModal() {
        this.newStructureModalVisible = false;
      },
      removeStructure() {
        this.$store.commit('removeSelectedEntity');
      },
      onStructureSelect(structure) {
        this.$store.commit('setEntitySelection', { type: 'structure', entity: structure });
      },
      computeTableHeight() {
        this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock);
      },
      onNewStructureOk() {
        this.hideNewStructureModal();
        this.$store.commit('addStructure', this.newStructure);
      },
    },
    computed: {
      structures() {
        return this.$store.state.model.structures;
      },
      filteredStructures() {
        return this.structures.filter(e => objStrSearchFilter(this.searchStr, e, ['name', 'type']));
      },
      emptyTableText() {
        return this.searchStr ? 'No matching structures' : 'Create a structure by using buttons below';
      },
      removeBtnDisabled() {
        return get(this.$store.state, 'selectedEntity.type') !== 'structure';
      },
      nonBnglStructures: {
        get() {
          return this.$store.state.model.nonBnglStructures;
        },
        set(value) {
          this.$store.commit('setNonBnglStructures', value);
        },
      },
    },
  };
</script>