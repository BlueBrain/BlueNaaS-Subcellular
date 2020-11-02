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
        @on-row-click="onStructureSelect"
      />
    </div>

    <div class="block-footer">
      <Row>
        <i-col span="12">
          <i-button type="primary" @click="addStructure"> New Structure </i-button>
          <i-button
            class="ml-24"
            type="warning"
            :disabled="removeBtnDisabled"
            @click="removeStructure"
          >
            Delete
          </i-button>
        </i-col>
        <i-col span="12">
          <i-input search v-model="searchStr" placeholder="Search" />
        </i-col>
      </Row>
    </div>

    <Modal
      v-model="newStructureModalVisible"
      title="New Molecule"
      class-name="vertical-center-modal"
      @on-ok="onNewStructureOk"
    >
      <structure-form ref="structureForm" v-model="newStructure" @on-submit="onNewStructureOk" />
      <div slot="footer">
        <i-button class="mr-6" type="text" @click="hideNewStructureModal"> Cancel </i-button>
        <i-button type="primary" :disabled="!newStructure.valid" @click="onNewStructureOk">
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
  import BnglText from '@/components/shared/bngl-text.vue';

  const { StructureType } = constants;

  const defaultStructure = {
    name: '',
    valid: false,
    type: StructureType.COMPARTMENT,
    unit: {
      str: 'm³',
    },
    parentName: '-',
    geometryStructureName: '',
    size: '',
    geometryStructureSize: '',
    annotation: '',
  };

  const searchProps = ['name', 'type'];

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
        newStructure: { ...defaultStructure },
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
        this.newStructure = {
          ...defaultStructure,
          name: findUniqName(this.structures, 'ST'),
          valid: true,
        };
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
      onStructureSelect(structure, index) {
        this.$store.commit('setEntitySelection', {
          index,
          type: 'structure',
          entity: structure,
        });
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
        return this.structures.filter((e) =>
          objStrSearchFilter(this.searchStr, e, { include: searchProps }),
        );
      },
      emptyTableText() {
        return this.searchStr
          ? 'No matching structures'
          : 'Create a structure by using buttons below';
      },
      removeBtnDisabled() {
        return get(this.$store.state, 'selectedEntity.type') !== 'structure';
      },
      geometry() {
        return this.$store.state.model.geometry;
      },
      columns() {
        const columns = [
          {
            title: 'Name',
            key: 'name',
          },
          {
            title: 'Type',
            key: 'type',
            maxWidth: 140,
          },
          {
            title: 'Parent',
            key: 'parentName',
          },
          {
            title: this.geometry ? 'Size, m³ (computed from geometry)' : 'Size',
            render: (h, params) =>
              this.geometry && !params.row.geometryStructureSize
                ? h('span', 'NA')
                : h(BnglText, {
                    props: {
                      entityType: 'parameter',
                      value: this.geometry
                        ? params.row.geometryStructureSize || 'NA'
                        : params.row.size,
                    },
                  }),
          },
          {
            title: 'Annotation',
            render: (h, params) => h('span', get(params, 'row.annotation', '').split('\n')[0]),
          },
        ];

        if (this.geometry) {
          columns.splice(3, 0, {
            title: 'Geometry structure',
            render: (h, params) =>
              h('span', {
                class: { 'text-error': !params.row.geometryStructureName },
                domProps: {
                  innerHTML: params.row.geometryStructureName || 'Not set',
                },
              }),
          });
        }

        return columns;
      },
    },
  };
</script>
