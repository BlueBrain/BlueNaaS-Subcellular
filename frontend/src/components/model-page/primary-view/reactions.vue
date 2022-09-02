<template>
  <split v-if="$store.state.model.id">
    <template v-slot:primary>
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
              <i-button type="primary" @click="add"> New Reaction </i-button>
              <i-button class="ml-24" type="warning" :disabled="!current.id" @click="remove"> Delete </i-button>
              <div v-if="deleteError" stylxe="margin-left: 8px; color: red; display: inline-block">
                An error ocurred please try again
              </div>
            </i-col>
            <i-col span="12">
              <i-input search v-model="searchStr" placeholder="Search" />
            </i-col>
          </Row>
        </div>

        <Modal v-model="newReactionModalVisible" title="New Reaction" class-name="vertical-center-modal" @on-ok="onOk">
          <reaction-form ref="reactionForm" v-model="current" @on-submit="onOk" />
          <div slot="footer">
            <i-button class="mr-6" type="text" @click="hideNewReactionModal"> Cancel </i-button>
            <i-button type="primary" :disabled="!current.valid" @click="onOk"> OK </i-button>
            <div v-if="error" style="margin-left: 8px; color: red; display: inline-block">
              An error ocurred please try again
            </div>
          </div>
        </Modal>
      </div>
    </template>
    <template v-slot:secondary>
      <properties v-if="current.id" v-model="current" :error="error" @apply="onOk" />
      <div v-else class="h-100 p-12">
        <p>Select reactions to view/edit properties</p>
      </div>
    </template>
  </split>
  <div v-else style="margin-left: 20px; margin-top: 10px; font-size: 16px">Load a model to view its reactions</div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import { get as getr, post, patch, del } from '@/services/api'
import { Reaction } from '@/types'
import { AxiosResponse } from 'axios'

import bus from '@/services/event-bus'

import BnglText from '@/components/shared/bngl-text.vue'
import ReactionForm from '@/components/shared/entities/reaction-form.vue'
import Split from '@/components/split.vue'
import Properties from '@/components/model-page/secondary-view/reaction-properties.vue'

import findUniqName from '@/tools/find-uniq-name'
import objStrSearchFilter from '@/tools/obj-str-search-filter'
import blockHeightWoPadding from '@/tools/block-height-wo-padding'

const defaultReaction = {
  id: undefined,
  name: '',
  valid: false,
  definition: '',
  kf: '',
  kr: '',
  annotation: '',
}

const searchProps = ['name', 'definition']

export default {
  name: 'reactions-component',
  components: {
    split: Split,
    properties: Properties,
    'reaction-form': ReactionForm,
  },
  data() {
    return {
      error: false,
      deleteError: false,
      reactions: [],
      searchStr: '',
      tableHeight: null,
      newReactionModalVisible: false,
      current: { ...defaultReaction },
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
    }
  },
  async created() {
    this.reactions = await this.getReactions()
  },
  mounted() {
    this.timeoutId = window.setTimeout(() => this.computeTableHeight(), 0)
    bus.$on('layoutChange', () => this.computeTableHeight())
  },
  beforeDestroy() {
    window.clearTimeout(this.timeoutId)
    bus.$off('layoutChange')
  },
  methods: {
    async getReactions() {
      const model = this.$store.state.model

      if (!model?.id) return []

      const res: AxiosResponse<Reaction[]> = await getr('reactions', {
        user_id: model?.user_id,
        model_id: model?.id,
      })

      return res.data
    },

    add() {
      this.current = {
        ...defaultReaction,
        name: findUniqName(this.reactions, 'r'),
      }
      this.showNewReactionModal()

      this.$nextTick(() => {
        this.$refs.reactionForm.refresh()
        this.$refs.reactionForm.focus()
      })
    },
    async remove() {
      const res = await del<null>(`reactions/${this.current.id}`)
      if (!res) {
        this.deleteError = true
        return
      }

      this.deleteError = false

      this.current = { ...defaultReaction }
      this.reactions = await this.getReactions()
    },
    showNewReactionModal() {
      this.newReactionModalVisible = true
    },
    hideNewReactionModal() {
      this.newReactionModalVisible = false
    },
    onReactionSelect(reaction: Reaction) {
      this.current = reaction
    },
    async onOk() {
      this.error = false

      const model_id = this.$store.state.model?.id
      let res: AxiosResponse<Reaction> | undefined

      if (!this.current.id) res = await post<Reaction>('reactions', { ...this.current, model_id })
      else res = await patch<Reaction>(`reactions/${this.current.id}`, this.current)

      if (!res) {
        this.error = true
        return
      }

      this.hideNewReactionModal()

      this.reactions = await this.getReactions()
    },
    computeTableHeight() {
      this.tableHeight = blockHeightWoPadding(this.$refs.mainBlock)
    },
  },
  computed: mapState({
    filteredReactions() {
      return this.reactions.filter((e) => objStrSearchFilter(this.searchStr, e, { include: searchProps }))
    },
    emptyTableText() {
      return this.searchStr ? 'No matching reactions' : 'Create a reaction by using buttons below'
    },
  }),
}
</script>

<style lang="scss">
.ivu-table-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
