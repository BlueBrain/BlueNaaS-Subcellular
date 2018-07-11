
<template>
  <div>
    <h3 class="mt-12">Protein selector</h3>

    <Row class="mt-12" :gutter="12">
      <i-col :span="12">
        <h4>All Proteins</h4>
        <i-select
          v-model="currentProteinListId"
          class="mt-6"
          size="small"
        >
          <i-option
            v-for="(listLabel, listId) of proteinList"
            :key="listId"
            :value="listId"
          >
            {{ listLabel }}
          </i-option>
        </i-select>

        <collection-text-filter-input
          class="mt-6"
          v-model="proteins.availableFiltered"
          :collection="proteins.available"
          :filter-by="proteinSearchProps"
        />

        <div class="virtual-list-container p-6 mt-6">
          <virtual-list
            :size="24"
            :remain="10"
          >
            <div
              class="list-element"
              v-for="protein of proteins.availableFiltered"
              :key="protein.id"
            >
              <div class="text-container">
                {{ protein.protNames | majorProteinName }}
              </div>
              <Icon
                class="icon ml-6"
                type="plus"
                @click="addProtein(protein)"
              />
            </div>
          </virtual-list>
        </div>

        <div class="mt-6">
          <i-button
            size="small"
            @click="onAddFiltered"
          >
            Add filtered
          </i-button>
        </div>
      </i-col>
      <i-col :span="12">
        <h4>Selected proteins</h4>

        <collection-text-filter-input
          class="mt-6"
          v-model="proteins.selectedFiltered"
          :collection="proteins.selected"
          :filter-by="proteinSearchProps"
        />

        <div class="virtual-list-container p-6 mt-6">
          <virtual-list
            :size="24"
            :remain="10"
          >
            <div
              class="list-element"
              v-for="protein of proteins.selectedFiltered"
              :key="protein.id"
            >
              <div class="text-container">
                {{ protein.protNames && protein.protNames.split(';')[0] }}
              </div>
              <Icon
                class="icon ml-6"
                type="minus"
                @click="removeProtein(protein)"
              />
            </div>
          </virtual-list>
        </div>

        <Row class="mt-6">
          <i-col :span="12">
            <i-button
              size="small"
              @click="createCustomProteinList"
            >
              Create protein group
            </i-button>
          </i-col>
          <i-col :span="12" class="text-right">
            <i-button
              size="small"
              type="warning"
              @click="onClearSelected"
            >
              Clear list
            </i-button>
          </i-col>
        </Row>
      </i-col>
    </Row>
  </div>
</template>


<script>
  import clone from 'lodash/clone';
  import VirtualList from 'vue-virtual-scroll-list';
  import CollectionTextFilterInput from '@/components//shared/collection-text-filter-input.vue';

  // TODO: add integration to load proteins from remote backend (nexus?)
  import proteinsRaw from '@/cell_proteins_reduced.json';

  const sortFunc = (p1, p2) => (p1.protNames < p2.protNames ? -1 : 1);

  const proteinList = {
    all: 'All',
    plasticity: 'Plasticity Proteins',
    geneRegulation: 'Gene Regulation',
    signalling: 'Signalling',
    metabolism: 'Metabolism',
  };

  const proteinSearchProps = ['majProtIds', 'linId', 'geneName', 'protNames'];

  const allProteins = proteinsRaw
    .filter(p => p.protNames)
    .sort(sortFunc)
    .map((p, index) => Object.assign({ id: index }, p));

  export default {
    name: 'protein-selector',
    props: ['value'],
    components: {
      'virtual-list': VirtualList,
      'collection-text-filter-input': CollectionTextFilterInput,
    },
    data() {
      return {
        proteinList,
        proteinSearchProps,
        currentProteinListId: 'all',
        neuron: null,
        synapse: null,
        proteins: {
          all: allProteins,
          available: allProteins,
          availableFiltered: allProteins,
          selected: clone(this.value || []),
          selectedFiltered: [],
        },
        searchStr: {
          available: '',
          selected: '',
        },
      };
    },
    methods: {
      sortProteins() {
        this.proteins.available.sort(sortFunc);
        this.proteins.selected.sort(sortFunc);
      },
      addProtein(protein) {
        this.proteins.selected.push(protein);
        this.proteins.available = this.proteins.available.filter(p => p.id !== protein.id);
        this.onProteinListChange();
      },
      removeProtein(protein) {
        this.proteins.selected = this.proteins.selected.filter(p => p.id !== protein.id);
        this.proteins.available.push(protein);
        this.onProteinListChange();
      },
      onAddFiltered() {
        this.proteins.selected = this.proteins.selected.concat(this.proteins.availableFiltered);
        const idsToRemove = this.proteins.availableFiltered.map(p => p.id);
        this.proteins.available = this.proteins.available.filter(p => !idsToRemove.includes(p.id));
        this.proteins.availableFiltered = [];
        this.onProteinListChange();
      },
      onClearSelected() {
        this.proteins.available = this.proteins.all;
        this.proteins.selected = [];
        this.onProteinListChange();
      },
      onProteinListChange() {
        this.sortProteins();
        this.emitChange();
      },
      emitChange() {
        this.$emit('input', this.proteins.selected);
      },
      createCustomProteinList() {
        const that = this;
        this.$Modal.confirm({
          render: (h) => {
            return h('Input', {
              props: {
                value: '',
                autofocus: true,
                placeholder: 'Protein list name',
              },
              on: {
                input: (val) => {
                  that.customProteinListName = val;
                },
              },
            });
          },
          onOk: () => {
            that.$set(that.proteinList, that.customProteinListName, that.customProteinListName);
          },
        });
      },
    },
  };
</script>


<style lang="scss" scoped>
  .list-element {
    height: 24px;
    line-height: 24px;

    .text-container {
      display: inline-block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: calc(100% - 38px);
      vertical-align: middle;
    }

    .icon {
      visibility: hidden;
      padding: 4px;
      cursor: pointer;
      user-select: none;
    }

    &:hover {
      background-color: #ebf7ff;

      .icon {
        visibility: visible;
      }
    }
  }

  .virtual-list-container {
    border: 1px solid #dddee1;
    border-radius: 3px;
  }
</style>
