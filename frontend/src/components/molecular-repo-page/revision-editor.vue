<template>
  <div>
    <Row class="mt-24" :gutter="12" type="flex">
      <i-col span="12">
        <revision-import />
      </i-col>
      <i-col span="12">
        <Row :gutter="12" type="flex">
          <i-col span="8" offset="8" class="text-right">
            <i-button type="warning" @click="clearRevisionEditor"> Clear revision </i-button>
          </i-col>
          <i-col span="8">
            <file-import-button />
          </i-col>
        </Row>
      </i-col>
    </Row>

    <revision-content class="mt-24" />
    <error-management class="mt-24" />

    <Row class="mt-24" :gutter="12" type="flex">
      <i-col offset="20" span="4">
        <AutoComplete
          v-model="branch"
          :data="userBranches"
          :filter-method="userBranchesFilter"
          placeholder="Branch"
          transfer
          @on-change="validateBranch"
          @on-focus="onBranchInputFocus"
        />
        <i-button
          class="mt-12"
          type="primary"
          :disabled="!branch || !revisionValid"
          :loading="saving"
          long
          @click="onSaveClick"
        >
          Save
        </i-button>
      </i-col>
    </Row>
  </div>
</template>

<script>
import socket from '@/services/websocket'

import FileImportButton from './revision-editor/file-import-button.vue'
import RevisionImport from './revision-editor/revision-import.vue'
import RevisionContent from './revision-editor/revision-content.vue'
import ErrorManagement from './revision-editor/error-management.vue'

export default {
  name: 'revision-editor',
  components: {
    'file-import-button': FileImportButton,
    'revision-import': RevisionImport,
    'revision-content': RevisionContent,
    'error-management': ErrorManagement,
  },
  data() {
    return {
      userBranches: [],
      saving: false,
    }
  },
  mounted() {
    this.loadUserBranches()
  },
  methods: {
    onBranchInputFocus() {
      this.loadUserBranches()
    },
    async loadUserBranches() {
      const userBranchesRes = await socket.request('get_user_branches')
      this.userBranches = userBranchesRes.userBranches
    },
    userBranchesFilter(searchStr, branch) {
      return branch.toUpperCase().indexOf(searchStr.toUpperCase()) !== -1
    },
    
    async saveRevision() {
      this.saving = true
      const meta = await this.$store.dispatch('saveRevision')
      setTimeout(() => {
        this.saving = false
      }, 900)
      this.$Notice.success({
        title: `Revision ${meta.branch}:${meta.rev} has been saved`,
      })
    },
    clearRevisionEditor() {
      this.$store.commit('clearRevisionEditor')
    },
    async onSaveClick() {
      if (!this.userBranches.includes(this.branch)) {
        this.$Modal.confirm({
          title: `Create new branch ${this.branch}?`,
          onOk: () => this.saveRevision(),
        })
        return
      }

      this.saveRevision()
    },
  },
  computed: {
    branch: {
      get() {
        return this.$store.state.revision.branch
      },
      set(branch) {
        this.$store.commit('setRevisionBranch', branch)
      },
    },
    revisionValid() {
      return this.$store.state.revision.valid
    },
  },
}
</script>
