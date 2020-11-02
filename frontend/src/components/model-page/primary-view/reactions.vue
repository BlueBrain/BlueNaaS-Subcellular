<template>
  <div class="h-100 pos-relative o-hidden">
    <div class="block-head">
      <h3>Reactions</h3>
    </div>

    <div class="block-main" ref="mainBlock">
      <i-table
        highlight-row
        :no-data-text="emptyTableText"
        :height="tableHeight"
        :columns="columns"
        :data="filteredReactions"
        @on-row-click="onReactionSelect"
      />
    </div>

    <div class="block-footer">
      <Row>
        <i-col span="12">
          <i-button type="primary" @click="addReaction"> New Reaction </i-button>
          <i-button
            class="ml-24"
            type="warning"
            :disabled="removeBtnDisabled"
            @click="removeReaction"
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
      v-model="newReactionModalVisible"
      title="New Reaction"
      class-name="vertical-center-modal"
      @on-ok="onOk"
    >
      <reaction-form ref="reactionForm" v-model="newReaction" />
      <div slot="footer">
        <i-button class="mr-6" type="text" @click="hideNewReactionModal"> Cancel </i-button>
        <i-button type="primary" :disabled="!newReaction.valid" @click="onOk"> OK </i-button>
      </div>
    </Modal>
  </div>
</template>

<script>
  import { mapState } from 'vuex';
  import get from 'lodash/get';

  import bus from '@/services/event-bus';

  import BnglText from '@/components/shared/bngl-text.vue';
  import ReactionForm from '@/components/shared/entities/reaction-form.vue';

  import findUniqName from '@/tools/find-uniq-name';
  import objStrSearchFilter from '@/tools/obj-str-search-filter';
  import blockHeightWoPadding from '@/tools/block-height-wo-padding';

  const defaultReaction = {
    name: '',
    valid: false,
    definition: '',
    kf: '',
    kr: '',
    annotation: '',
  };

  const searchProps = ['name', 'definition'];

  export default {
    name: 'reactions-component',
    components: {
      'reaction-form': ReactionForm,
    },
    data() {
      return {
        searchStr: '',
        tableHeight: null,
        newReactionModalVisible: false,
        newReaction: { ...defaultReaction },
        columns: [
          {
            title: 'Name',
            key: 'name',
            maxWidth: 180,
          },
          {
            title: 'Kf',
            render: (h, params) =>
              h(BnglText, {
                props: {
                  entityType: 'parameter',
                  readOnly: true,
                  value: params.row.kf,
                },
              }),
            maxWidth: 180,
          },
          {
            title: 'Kr',
            render: (h, params) =>
              h(BnglText, {
                props: {
                  entityType: 'parameter',
                  readOnly: true,
                  value: params.row.kr,
                },
              }),
            maxWidth: 180,
          },
          {
            title: 'BioNetGen definition',
            render: (h, params) =>
              h(BnglText, {
                props: {
                  entityType: 'reaction',
                  readOnly: true,
                  value: params.row.definition,
                },
              }),
          },
        ],
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
      addReaction() {
        this.newReaction = {
          ...defaultReaction,
          name: findUniqName(this.reactions, 'r'),
        };
        this.showNewReactionModal();

        this.$nextTick(() => {
          this.$refs.reactionForm.refresh();
          this.$refs.reactionForm.focus();
        });
      },
      showNewReactionModal() {
        this.newReactionModalVisible = true;
      },
      hideNewReactionModal() {
        this.newReactionModalVisible = false;
      },
      onChange(index) {
        return (definition) => {
          this.$store.commit('modifyEntity', {
            type: 'reaction',
            entityIndex: index,
            keyName: 'definition',
            value: definition,
          });
        };
      },
      removeReaction() {
        this.$store.commit('removeSelectedEntity');
      },
      onReactionSelect(reaction, index) {
        this.$store.commit('setEntitySelection', {
          index,
          type: 'reaction',
          entity: reaction,
        });
      },
      onOk() {
        this.hideNewReactionModal();
        this.$store.commit('addReaction', this.newReaction);
      },
      computeTableHeight() {
        this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock);
      },
    },
    computed: mapState({
      reactions(state) {
        return state.model.reactions;
      },
      filteredReactions() {
        return this.reactions.filter((e) =>
          objStrSearchFilter(this.searchStr, e, { include: searchProps }),
        );
      },
      emptyTableText() {
        return this.searchStr
          ? 'No matching reactions'
          : 'Create a reaction by using buttons below';
      },
      removeBtnDisabled: (state) => get(state, 'selectedEntity.type') !== 'reaction',
    }),
  };
</script>

<style lang="scss">
  .ivu-table-cell {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
