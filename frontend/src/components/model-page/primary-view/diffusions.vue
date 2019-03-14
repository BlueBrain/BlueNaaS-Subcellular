
<template>
  <div class="h-100 pos-relative o-hidden">

    <div class="block-head">
      <h3>Diffusions</h3>
    </div>

    <div class="block-main" ref="mainBlock">
      <i-table
        highlight-row
        :no-data-text="emptyTableText"
        :height="tableHeight"
        :columns="columns"
        :data="filteredDiffusions"
        @on-current-change="onDiffusionSelect"
      />
    </div>

    <div class="block-footer">
      <Row>
        <i-col span="12">
          <i-button
            type="primary"
            @click="addDiffusion"
          >
            New Diffusion
          </i-button>
          <i-button
            class="ml-24"
            type="warning"
            :disabled="removeBtnDisabled"
            @click="removeDiffusion"
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
      v-model="newDiffusionModalVisible"
      title="New Diffusion"
      class-name="vertical-center-modal"
    >
      <diffusion-form
        ref="diffusionForm"
        v-model="newDiffusion"
        @on-submit="onOk"
      />
      <div slot="footer">
        <i-button
          class="mr-6"
          type="text"
          @click="hideNewDiffusionModal"
        >
          Cancel
        </i-button>
        <i-button
          type="primary"
          :disabled="!newDiffusion.valid"
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
  import DiffusionForm from '@/components/shared/entities/diffusion-form.vue';

  import findUniqName from '@/tools/find-uniq-name';
  import objStrSearchFilter from '@/tools/obj-str-search-filter';
  import blockHeightWoPadding from '@/tools/block-height-wo-padding';

  const defaultDiffusion = {
    valid: false,
    name: '',
    speciesDefinition: '',
    diffusionConstant: '',
    compartment: '',
    annotation: '',
  };


  export default {
    name: 'diffusion-component',
    components: {
      'diffusion-form': DiffusionForm,

    },
    data() {
      return {
        searchStr: '',
        tableHeight: null,
        newDiffusionModalVisible: false,
        newDiffusion: Object.assign({}, defaultDiffusion),
        columns: [{
          title: 'Name',
          key: 'name',
          maxWidth: 180,
        }, {
          title: 'Compartment',
          key: 'compartment',
          maxWidth: 180,
        }, {
          title: 'Species BNG definition',
          render: (h, params) => h(BnglInput, {
            props: {
              entityType: 'diffusion',
              readOnly: true,
              value: params.row.speciesDefinition,
            },
          }),
        }, {
          title: 'Diffusion constant',
          render: (h, params) => h(BnglInput, {
            props: {
              entityType: 'parameter',
              readOnly: true,
              value: params.row.diffusionConstant,
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
      addDiffusion() {
        this.newDiffusion = Object.assign({}, defaultDiffusion, { name: findUniqName(this.diffusions, 'diff') });
        this.showNewDiffusionModal();

        this.$nextTick(() => {
          this.$refs.diffusionForm.refresh();
          this.$refs.diffusionForm.focus();
        });
      },
      removeDiffusion() {
        this.$store.commit('removeSelectedEntity');
      },
      onDiffusionSelect(diffusion) {
        this.$store.commit('setEntitySelection', { type: 'diffusion', entity: diffusion });
      },
      onOk() {
        this.hideNewDiffusionModal();
        this.$store.commit('addDiffusion', this.newDiffusion);
      },
      hideNewDiffusionModal() {
        this.newDiffusionModalVisible = false;
      },
      showNewDiffusionModal() {
        this.newDiffusionModalVisible = true;
      },
      computeTableHeight() {
        this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock);
      },
    },
    computed: mapState({
      diffusions(state) {
        return state.model.diffusions;
      },
      filteredDiffusions() {
        return this.diffusions.filter(e => objStrSearchFilter(this.searchStr, e, ['name', 'speciesDefinition', 'compartment']));
      },
      emptyTableText() {
        return this.searchStr ? 'No matching diffusions' : 'Create a diffusion by using buttons below';
      },
      removeBtnDisabled: state => get(state, 'selectedEntity.type') !== 'diffusion',
    }),
  };
</script>