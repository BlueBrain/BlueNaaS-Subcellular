
<template>
  <div class="h-100 pos-relative o-hidden">

    <div class="block-head">
      <h3>Functions</h3>
    </div>

    <div class="block-main" ref="mainBlock">
      <i-table
        highlight-row
        :no-data-text="emptyTableText"
        :height="tableHeight"
        :columns="columns"
        :data="filteredFunctions"
        @on-row-click="onFunctionSelect"
      />
    </div>

    <div class="block-footer">
      <Row>
        <i-col span="12">
          <i-button
            type="primary"
            @click="addFunction"
          >
            New Function
          </i-button>
          <i-button
            class="ml-24"
            type="warning"
            :disabled="removeBtnDisabled"
            @click="removeFunction"
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
      v-model="newFunctionModalVisible"
      title="New Function"
      class-name="vertical-center-modal"
      @on-ok="onOk"
    >
      <function-form
        ref="functionForm"
        v-model="newFunction"
      />
      <div slot="footer">
        <i-button
          class="mr-6"
          type="text"
          @click="hideNewFunctionModal"
        >
          Cancel
        </i-button>
        <i-button
          type="primary"
          :disabled="!newFunction.valid"
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

  import BnglText from '@/components/shared/bngl-text.vue';
  import FunctionForm from '@/components/shared/entities/function-form.vue';

  import findUniqName from '@/tools/find-uniq-name';
  import objStrSearchFilter from '@/tools/obj-str-search-filter';
  import blockHeightWoPadding from '@/tools/block-height-wo-padding';

  const defaultFunction = {
    name: '',
    valid: false,
    definition: '',
    argument: '',
    annotation: '',
  };


  export default {
    name: 'function-component',
    components: {
      'function-form': FunctionForm,

    },
    data() {
      return {
        searchStr: '',
        tableHeight: null,
        newFunctionModalVisible: false,
        newFunction: Object.assign({}, defaultFunction),
        columns: [{
          title: 'Name',
          key: 'name',
          maxWidth: 240,
        }, {
          title: 'Arg',
          key: 'argument',
          maxWidth: 120,
        }, {
          title: 'BioNetGen definition',
          render: (h, params) => h(BnglText, {
            props: {
              entityType: 'function',
              value: params.row.definition,
            },
          }),
        }, {
          title: 'Annotation',
          maxWidth: 240,
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
      addFunction() {
        this.newFunction = Object.assign({}, defaultFunction, { name: findUniqName(this.functions, 'f') });
        this.showNewFunctionModal();

        this.$nextTick(() => {
          this.$refs.functionForm.refresh();
          this.$refs.functionForm.focus();
        });
      },
      showNewFunctionModal() {
        this.newFunctionModalVisible = true;
      },
      hideNewFunctionModal() {
        this.newFunctionModalVisible = false;
      },
      removeFunction() {
        this.$store.commit('removeSelectedEntity');
      },
      onFunctionSelect(func, index) {
        this.$store.commit('setEntitySelection', { index, type: 'function', entity: func });
      },
      onOk() {
        this.hideNewFunctionModal();
        this.$store.commit('addFunction', this.newFunction);
      },
      computeTableHeight() {
        this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock);
      },
    },
    computed: mapState({
      functions(state) {
        return state.model.functions;
      },
      filteredFunctions() {
        return this.functions.filter(e => objStrSearchFilter(this.searchStr, e, ['name', 'definition']));
      },
      emptyTableText() {
        return this.searchStr ? 'No matching functions' : 'Create a function by using buttons below';
      },
      removeBtnDisabled: state => get(state, 'selectedEntity.type') !== 'function',
    }),
  };
</script>
