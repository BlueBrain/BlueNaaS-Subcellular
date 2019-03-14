
<template>
  <div class="h-100 pos-relative o-hidden">

    <div class="block-head">
      <h3>Parameters</h3>
    </div>

    <div class="block-main" ref="mainBlock">
      <i-table
        highlight-row
        :no-data-text="emptyTableText"
        :height="tableHeight"
        :columns="columns"
        :data="filteredParameters"
        @on-current-change="onParameterSelect"
      />
    </div>

    <div class="block-footer">
      <Row>
        <i-col span="12">
          <i-button
            type="primary"
            @click="addParameter"
          >
            New Parameter
          </i-button>
          <i-button
            class="ml-24"
            type="warning"
            :disabled="removeBtnDisabled"
            @click="removeParameter"
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
      v-model="newParameterModalVisible"
      title="New Parameter"
      class-name="vertical-center-modal"
    >
      <parameter-form
        ref="parameterForm"
        v-model="newParameter"
        @on-submit="onOk"
      />
      <div slot="footer">
        <i-button
          class="mr-6"
          type="text"
          @click="hideNewParameterModal"
        >
          Cancel
        </i-button>
        <i-button
          type="primary"
          :disabled="!newParameter.valid"
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
  import ParameterForm from '@/components/shared/entities/parameter-form.vue';

  import findUniqName from '@/tools/find-uniq-name';
  import objStrSearchFilter from '@/tools/obj-str-search-filter';
  import blockHeightWoPadding from '@/tools/block-height-wo-padding';

  const defaultParameter = {
    valid: false,
    name: '',
    definition: '',
    unit: null,
    annotation: '',
  };


  export default {
    name: 'parameters-component',
    components: {
      'parameter-form': ParameterForm,

    },
    data() {
      return {
        searchStr: '',
        tableHeight: null,
        newParameterModalVisible: false,
        newParameter: Object.assign({}, defaultParameter),
        columns: [{
          title: 'Name',
          key: 'name',
          maxWidth: 300,
        }, {
          title: 'BioNetGen definition',
          render: (h, params) => h(BnglInput, {
            props: {
              entityType: 'parameter',
              readOnly: true,
              value: params.row.definition,
            },
          }),
        }, {
          title: 'Unit',
          render: (h, params) => h('span', get(params, 'row.unit.val'), '-'),
          maxWidth: 80,
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
      addParameter() {
        this.newParameter = Object.assign({}, defaultParameter, { name: findUniqName(this.parameters, 'p') });
        this.showNewParameterModal();

        this.$nextTick(() => {
          this.$refs.parameterForm.refresh();
          this.$refs.parameterForm.focus();
        });
      },
      removeParameter() {
        this.$store.commit('removeSelectedEntity');
      },
      onParameterSelect(parameter) {
        this.$store.commit('setEntitySelection', { type: 'parameter', entity: parameter });
      },
      onOk() {
        this.hideNewParameterModal();
        this.$store.commit('addParameter', this.newParameter);
      },
      showNewParameterModal() {
        this.newParameterModalVisible = true;
      },
      hideNewParameterModal() {
        this.newParameterModalVisible = false;
      },
      computeTableHeight() {
        this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock);
      },
    },
    computed: mapState({
      parameters(state) {
        return state.model.parameters;
      },
      filteredParameters() {
        return this.parameters.filter(e => objStrSearchFilter(this.searchStr, e, ['name', 'bioNetGenDef']));
      },
      emptyTableText() {
        return this.searchStr ? 'No matching parameters' : 'Create a parameter by using buttons below';
      },
      removeBtnDisabled: state => get(state, 'selectedEntity.type') !== 'parameter',
    }),
  };
</script>