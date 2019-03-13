
<template>
  <div class="h-100 pos-relative o-hidden">

    <div class="block-head">
      <h3>Observables</h3>
    </div>

    <div class="block-main" ref="mainBlock">
      <i-table
        highlight-row
        :no-data-text="emptyTableText"
        :height="tableHeight"
        :columns="columns"
        :data="filteredEntities"
        @on-current-change="onObservableSelect"
      />
    </div>

    <div class="block-footer">
      <Row>
        <i-col span="12">
          <i-button
            type="primary"
            @click="addObservable"
          >
            New Observable
          </i-button>
          <i-button
            class="ml-24"
            type="warning"
            :disabled="removeBtnDisabled"
            @click="removeObservable"
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
      v-model="newObservableModalVisible"
      title="New Reaction"
      class-name="vertical-center-modal"
      @on-ok="onOk"
    >
      <observable-form
        ref="observableForm"
        v-model="newObservable"
      />
      <div slot="footer">
        <i-button
          class="mr-6"
          type="text"
          @click="hideNewObservableModal"
        >
          Cancel
        </i-button>
        <i-button
          type="primary"
          :disabled="!newObservable.valid"
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
  import ObservableForm from '@/components/shared/entities/observable-form.vue';

  import findUniqName from '@/tools/find-uniq-name';
  import objStrSearchFilter from '@/tools/obj-str-search-filter';
  import blockHeightWoPadding from '@/tools/block-height-wo-padding';

  const defaultObservable = {
    name: '',
    valid: false,
    definition: '',
    annotation: '',
  };


  export default {
    name: 'observables-component',
    components: {
      'observable-form': ObservableForm,
    },
    data() {
      return {
        searchStr: '',
        tableHeight: null,
        newObservableModalVisible: false,
        newObservable: Object.assign({}, defaultObservable),
        columns: [{
          title: 'Name',
          key: 'name',
          maxWidth: 400,
        }, {
          title: 'BioNetGen definition',
          render: (h, params) => h(BnglInput, {
            props: {
              entityType: 'observable',
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
      addObservable() {
        this.newObservable = Object.assign({}, defaultObservable, { name: findUniqName(this.observables, 'o') });
        this.showNewObservableModal();

        this.$nextTick(() => {
          this.$refs.observableForm.refresh();
          this.$refs.observableForm.focus();
        });
      },
      showNewObservableModal() {
        this.newObservableModalVisible = true;
      },
      hideNewObservableModal() {
        this.newObservableModalVisible = false;
      },
      removeObservable() {
        this.$store.commit('removeSelectedEntity');
      },
      onObservableSelect(observable) {
        this.$store.commit('setEntitySelection', { type: 'observable', entity: observable });
      },
      onOk() {
        this.hideNewObservableModal();
        this.$store.commit('addObservable', this.newObservable);
      },
      computeTableHeight() {
        this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock);
      },
    },
    computed: mapState({
      observables(state) {
        return state.model.observables;
      },
      filteredEntities() {
        return this.observables.filter(e => objStrSearchFilter(this.searchStr, e, ['name', 'definition']));
      },
      emptyTableText() {
        return this.searchStr ? 'No matching observables' : 'Create a observable by using buttons below';
      },
      removeBtnDisabled: state => get(state, 'selectedEntity.type') !== 'observable',
    }),
  };
</script>
