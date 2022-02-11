<template>
  <Row :gutter="12" type="flex">
    <i-col span="8">
      <i-select
        v-model="branch"
        placeholder="Select branch"
        filterable
        remote
        :remote-method="queryBranchNames"
        :loading="loading.branches"
        @on-change="onBranchSelect"
        @on-query-change="onBranchQueryChange"
        @on-open-change="onBranchSelectOpenChange"
      >
        <i-option v-for="branch in branches" :value="branch" :key="branch">{{ branch }}</i-option>
      </i-select>
    </i-col>
    <i-col span="8">
      <i-select
        placeholder="Select revision"
        v-model="revision"
        remote
        :remote-method="queryRevisions"
        :loading="loading.revisions"
      >
        <i-option value="latest" key="latest">latest</i-option>
        <i-option v-for="revision in revisions" :value="revision" :key="revision">{{ revision }}</i-option>
      </i-select>
    </i-col>
    <i-col span="8">
      <i-button type="primary" long :disabled="!branch || !revision" :loading="importing" @click="importRevision">
        Import from revision
      </i-button>
    </i-col>
  </Row>
</template>

<script>
import socket from '@/services/websocket'

export default {
  name: 'revision-import',
  data() {
    return {
      branch: '',
      revision: '',
      branches: [],
      revisions: [],
      loading: {
        branches: false,
        revisions: false,
      },
      importing: false,
    }
  },
  async mounted() {
    this.queryBranchNames()
  },
  methods: {
    async queryBranchNames(searchStr) {
      this.loading.branches = true
      const { branches } = await socket.request('query_branch_names', searchStr)
      this.branches = branches
      this.loading.branches = false
    },
    onBranchSelectOpenChange(opened) {
      if (!opened) return

      this.queryBranchNames()
    },
    onBranchSelect() {
      this.queryRevisions()
    },
    onBranchQueryChange(queryStr) {
      if (!queryStr) {
        this.queryBranchNames()
      }
    },
    async queryRevisions() {
      if (!this.branch) return

      this.loading.revisions = true
      const { revisions } = await socket.request('query_revisions', this.branch)
      this.revisions = revisions
      this.loading.revisions = false
    },
    async importRevision() {
      this.importing = true
      await this.$store.dispatch('importRevision', {
        branch: this.branch,
        revision: this.revision,
      })
      this.$Notice.success({
        title: 'Import successfull',
        desc: `Revision ${this.branch}:${this.revision}`,
      })
      this.branch = ''
      this.revision = ''
      this.importing = false
    },
  },
}
</script>
