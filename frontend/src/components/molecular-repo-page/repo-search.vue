
<template>
  <div>
    <Card class="mt-12">
      <Row :gutter="24" type="flex">
        <i-col span="12">
          <h3 class="mb-12">Molecules</h3>
          <i-input
            v-model="query.moleculeStr"
            type="textarea"
            placeholder="Name, BNGL name, geneName, UniProt id, PubChem id"
            :rows="3"
          />
          <h3 class="mt-24 mb-12">Versions</h3>
          <revision-select v-model="query.versions"/>
        </i-col>
        <i-col span="12">
          <h3 class="mb-12">Structures</h3>
          <i-input
            v-model="query.structureStr"
            type="textarea"
            placeholder="UniProt struct Id/name, GO:cellular comp id"
            :rows="3"
          />
          <h3 class="mt-24 mb-12">Entity types</h3>

          <i-select
            v-model="query.entityTypes"
            transfer
            multiple
            filterable
          >
            <i-option
              v-for="(label, entityType) in entityLabels"
              :key="entityType"
              :value="entityType"
            >
              {{ label }}
            </i-option>
          </i-select>
        </i-col>
      </Row>
      <Row
        :gutter="24"
        class="mt-24"
      >
        <i-col span="8">
          <Dropdown
            class="query-dropdown"
            @on-click="onFilterActionClick"
            transfer
          >
            <Button>
                Filter
                <Icon type="ios-arrow-down"></Icon>
            </Button>
            <DropdownMenu slot="list">
                <DropdownItem name="load">Load</DropdownItem>
                <DropdownItem name="save">Save</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </i-col>
        <i-col
          span="8"
          push="8"
        >
          <i-button
            type="primary"
            long
            :disabled="!searchBtnEnabled"
            :loading="loading"
            @click="onSearchClick"
          >
            Search
          </i-button>
        </i-col>
      </Row>
    </Card>

    <Card
      class="mt-24"
      v-if="repoQueryResult"
    >
      <h3 v-if="queryResultEmpty">
        Search returned no results
      </h3>
      <search-content v-else/>

      <Row
        class="mt-24"
        :gutter="12"
      >
        <i-col
          span="8"
          offset="16"
        >
          <revision-merge
            :disabled="queryResultEmpty"
            :versions="queryResultVersions"
          />
        </i-col>
      </Row>
    </Card>

    <Modal
      v-model="importFilterModalVisible"
      title="Import filter from a JSON file"
      class-name="vertical-center-modal"
    >
      <file-import
        :file-formats="[{ extension: 'json', type: 'JSON' }]"
        :error-msg="filterImportError"
        @on-file-read="onFilterFileRead"
      />
      <div slot="footer">
        <i-button
          @click="hideImportFilterModal"
        >
          Cancel
        </i-button>
      </div>
    </Modal>
  </div>
</template>


<script>
  import { saveAs } from 'file-saver';
  import Ajv from 'ajv';

  import constants from '@/constants';
  import repoFilterSchema from '@/schemas/repo-filter.json';

  import FileImport from '@/components/shared/file-import.vue';

  import RevisionSelect from './repo-search/revision-select.vue';
  import SearchContent from './repo-search/search-content.vue';
  import RevisionMerge from './repo-search/revision-merge.vue';

  const validateFilter = new Ajv().compile(repoFilterSchema);

  const { EntityType } = constants;

  const entityLabels = {
    [EntityType.PARAMETER]: 'Parameters',
    [EntityType.STRUCTURE]: 'Structures',
    [EntityType.MOLECULE]: 'Molecules',
    [EntityType.SPECIES]: 'Species',
    [EntityType.OBSERVABLE]: 'Observables',
    [EntityType.FUNCTION]: 'Functions',
    [EntityType.REACTION]: 'Reactions',
  };

  export default {
    name: 'repo-search',
    components: {
      'revision-select': RevisionSelect,
      'search-content': SearchContent,
      'revision-merge': RevisionMerge,
      'file-import': FileImport,
    },
    data() {
      return {
        entityLabels,
        importFilterModalVisible: false,
        filterImportError: '',
        query: {
          moleculeStr: '',
          structureStr: '',
          versions: [{
            branch: 'master',
            revision: 'latest',
            key: 'master:latest',
          }],
          entityTypes: Object.keys(entityLabels),
        },
        result: {
          selectedEntity: null,
        },
      };
    },
    beforeDestroy() {
      this.$store.commit('resetMolecularRepo');
    },
    methods: {
      onSearchClick() {
        this.$store.commit('setQueryLoading', true);
        setTimeout(async () => {
          await this.$store.dispatch('queryMolecularRepo', this.query);
          this.$store.commit('setQueryLoading', false);
        }, 100);
      },
      onFilterActionClick(action) {
        if (action === 'save') {
          const blob = new Blob([JSON.stringify(this.query)], { type: 'text/plain;charset=utf-8' });
          saveAs(blob, 'filter.json');
        } else {
          this.showImportFilterModal();
        }
      },
      hideImportFilterModal() {
        this.importFilterModalVisible = false;
      },
      showImportFilterModal() {
        this.importFilterModalVisible = true;
      },
      onFilterFileRead({ content }) {
        let filter = null;
        try {
          filter = JSON.parse(content);
        } catch (error) {
          this.filterImportError = 'Can\'t parse file as JSON';
        }

        if (!filter) return;

        const schemaValid = validateFilter(filter);
        if (!schemaValid) {
          const [errObj] = validateFilter.errors;
          this.filterImportError = `error: ${errObj.dataPath} ${errObj.message}`;
          return;
        }

        this.query = filter;
        this.hideImportFilterModal();
        this.$Notice.success({ title: 'Filter successfully imported' });
      },
    },
    computed: {
      searchResultEntityTypes() {
        return Object.keys(this.$store.state.molecularRepo.queryResult || {});
      },
      repoQueryResult() {
        return !!this.$store.state.repoQueryResult;
      },
      searchBtnEnabled() {
        return this.query.versions.length && this.query.entityTypes.length;
      },
      loading() {
        return this.$store.state.revision.loading;
      },
      queryResultVersions() {
        return this.$store.getters.queryResultVersions;
      },
      queryResultEmpty() {
        const result = this.$store.state.repoQueryResult;
        return !result || Object.values(result).every(entities => !entities.length);
      },
    },
  };
</script>


<style lang="scss" scoped>
  .ivu-checkbox-group-item {
    display: block;
  }
</style>
