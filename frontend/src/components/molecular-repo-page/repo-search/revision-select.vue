
<template>
  <div>
    <div class="version-container">
      <Tag
        v-for="version in versions"
        :key="version.key"
        :name="version.key"
        closable
        @on-close="onVersionRemove"
      >
        {{ version.key }}
      </Tag>
    </div>

    <Row
      :gutter="12"
      class="mt-12"
    >
      <i-col span="8">
        <i-select
          ref="branchSelect"
          v-model="branch"
          placeholder="Select branch"
          filterable
          remote
          transfer
          :remote-method="queryBranchNames"
          :loading="loading.branches"
          @on-change="onBranchSelect"
          @on-query-change="onBranchQueryChange"
          @on-open-change="onBranchSelectOpenChange"
        >
          <i-option
            v-for="branch in branches"
            :value="branch"
            :key="branch"
          >{{ branch }}</i-option>
        </i-select>
      </i-col>
      <i-col span="8">
        <i-select
          ref="revisionSelect"
          v-model="revision"
          placeholder="Select revision"
          filterable
          transfer
          remote
          :remote-method="queryRevisions"
          :loading="loading.revisions"
        >
          <i-option
            value="latest"
            key="latest"
          >latest</i-option>
          <i-option
            v-for="revision in revisions"
            :value="revision"
            :key="revision"
          >{{ revision }}</i-option>
        </i-select>
      </i-col>
      <i-col span="8">
        <i-button
          long
          @click="addVersion"
          :disabled="!addBtnEnabled"
        >
          Add
        </i-button>
      </i-col>
    </Row>
  </div>
</template>


<script>
  // TODO: refactor to reuse branch selection logic in revision editor as well
  import cloneDeep from 'lodash/cloneDeep';

  import socket from '@/services/websocket';


  export default {
    name: 'revision-select',
    props: ['value'],
    data() {
      return {
        branch: '',
        revision: '',
        branches: [],
        revisions: [],
        versions: cloneDeep(this.value),
        loading: {
          branches: false,
          revisions: false,
        },
      };
    },
    mounted() {
      this.queryBranchNames();
    },
    methods: {
      emitChange() {
        this.$emit('input', this.versions);
      },
      onVersionRemove(event, key) {
        const index = this.versions.findIndex(v => v.key === key);
        this.versions.splice(index, 1);

        this.emitChange();
      },
      addVersion() {
        this.versions.push({
          branch: this.branch,
          revision: this.revision,
          key: `${this.branch}:${this.revision}`,
        });
        this.branch = '';
        this.revision = '';

        this.revisions = [];
        this.$refs.branchSelect.setQuery(null);
        this.$refs.revisionSelect.setQuery(null);

        this.emitChange();
      },
      async queryBranchNames(searchStr) {
        this.loading.branches = true;
        const { branches } = await socket.request('query_branch_names', searchStr);
        this.branches = branches;
        this.loading.branches = false;
      },
      onBranchSelectOpenChange(opened) {
        if (!opened) return;

        this.queryBranchNames();
      },
      onBranchSelect() {
        this.queryRevisions();
      },
      onBranchQueryChange(queryStr) {
        if (!queryStr) {
          this.queryBranchNames();
        }
      },
      async queryRevisions() {
        if (!this.branch) return;

        this.loading.revisions = true;
        const { revisions } = await socket.request('query_revisions', this.branch);
        this.revisions = revisions;
        this.loading.revisions = false;
      },
    },
    computed: {
      addBtnEnabled() {
        const key = `${this.branch}:${this.revision}`;
        return this.branch && this.revision && !this.versions.some(v => v.key === key);
      },
    },
  };
</script>


<style lang="scss" scoped>
  .version-container {
    border: 1px solid #dcdee2;
    padding: 6px;
    min-height: 40px;
  }
</style>
