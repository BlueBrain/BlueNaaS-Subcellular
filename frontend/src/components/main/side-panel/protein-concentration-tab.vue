
<template>
  <Card>
    <Row :gutter="6" type="flex">
      <i-col span="5">
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
      </i-col>
    </Row>

    <Row :gutter="6" type="flex" class="mt-6">
      <i-col span="5">
        <collection-text-filter-input
          v-model="proteinsFiltered"
          :collection="proteins"
          :filter-by="proteinSearchProps"
        />
      </i-col>
    </Row>

    <strong>
      <Row :gutter="6" type="flex" class="mt-12">
        <i-col span="5">
          Protein name
        </i-col>
        <i-col span="19">
          <Row
            :gutter="6"
            type="flex"
            justify="space-between"
          >
            <i-col
              span="2"
              v-for="location of proteinLocations"
              :key="location"
            >
              <div class="text-ellipsis">
                {{ location }}
              </div>
            </i-col>
          </Row>
        </i-col>
      </Row>
    </strong>

    <virtual-list
      class="mt-6"
      :size="(proteins.length) < 24 ? (proteins.length + 3) : 24"
      :remain="20"
      :bench="40"
    >
      <div
        class="list-item height-24"
        v-for="(protein, proteinIndex) of proteinsFiltered"
        :class="{'list-item-even': proteinIndex % 2}"
        :key="protein.id"
      >
        <Row :gutter="6" type="flex">
          <i-col span="5">
            <div :class="{modified: isProteinConcentrationsModified(protein)}">
              <div class="text-container text-ellipsis">
                {{ protein.protNames | majorProteinName }}
              </div>
              <Icon
                class="icon"
                type="ios-undo"
                color="#ff9900"
                @click="resetProteinConcentrations(protein)"
              />
            </div>
          </i-col>
          <i-col span="19">
            <Row :gutter="6" type="flex" justify="space-between">
              <i-col
                span="2"
                class="height-24"
                :class="{'modified': isConcentrationModified(protein.conc[location])}"
                v-for="location of proteinLocations"
                :key="location"
              >
                <div>
                  <div class="text-container">
                    <inline-value-editor v-model="protein.conc[location].val"/>
                  </div>
                  <Icon
                    class="icon"
                    type="ios-undo"
                    color="#ff9900"
                    @click="resetLocationConcentration(protein.conc[location])"
                  />
                </div>
              </i-col>
            </Row>
          </i-col>
        </Row>
      </div>
    </virtual-list>

    <Row class="mt-12">
      <i-col :span="12">
        <i-button
          size="small"
          type="warning"
          @click="resetAllConcentrations"
        >
          Reset all concentrations
        </i-button>
      </i-col>
      <i-col :span="12" class="text-right">
        <i-button
          size="small"
          type="primary"
          @click="exportProteins"
        >
          Export protein concentrations
        </i-button>
      </i-col>
    </Row>

  </Card>
</template>

<script>
  import cloneDeep from 'lodash/cloneDeep';
  import VirtualList from 'vue-virtual-scroll-list';

  import store from '@/store';

  import InlineValueEditor from '@/components/shared/inline-value-editor.vue';
  import CollectionTextFilterInput from '@/components/shared/collection-text-filter-input.vue';

  const proteinSearchProps = ['majProtIds', 'linId', 'geneName', 'protNames'];
  const proteinList = {
    all: 'All',
    plasticity: 'Plasticity Proteins',
    geneRegulation: 'Gene Regulation',
    signalling: 'Signalling',
    metabolism: 'Metabolism',
  };

  export default {
    name: 'protein-concentration-tab',
    components: {
      'virtual-list': VirtualList,
      'inline-value-editor': InlineValueEditor,
      'collection-text-filter-input': CollectionTextFilterInput,
    },
    data() {
      return {
        proteins: [],
        proteinsFiltered: [],
        proteinSearchProps,
        proteinList,
        currentProteinListId: 'all',
        proteinLocations: [
          'presyn',
          'postsyn',
          'cytosol',
          'nucleus',
          'er',
          'endosome',
          'golgi',
          'lysosome',
          'mitochondrion',
          'peroxisome',
          'membrane',
        ],
      };
    },
    mounted() {
      this.initProteins();
      store.$on('setProteinConcentrationState', () => {
        this.initProteins();
      });
    },
    methods: {
      initProteins() {
        const reducer = (acc, loc) => {
          const val = this.randomConcentration();
          return Object.assign(acc, { [loc]: { val, defaultVal: val } });
        };

        this.proteins = cloneDeep(store.state.proteins)
          .map(protein => Object.assign(protein, { conc: this.proteinLocations.reduce(reducer, {}) }));
      },
      isProteinConcentrationsModified(protein) {
        return Object.keys(protein.conc)
          .some(loc => protein.conc[loc].val !== protein.conc[loc].defaultVal);
      },
      isConcentrationModified(location) {
        return location.val !== location.defaultVal;
      },
      resetProteinConcentrations(protein) {
        Object.keys(protein.conc).forEach(loc => this.resetLocationConcentration(protein.conc[loc]));
      },
      resetAllConcentrations() {
        this.proteins.forEach(protein => this.resetProteinConcentrations(protein));
      },
      resetLocationConcentration(concentration) {
        concentration.val = concentration.defaultVal;
      },
      randomConcentration() {
        return Math.random() > 0.8 ? parseFloat(Math.random().toFixed(2)) : 0;
      },
      exportProteins() {},
    },
  };
</script>


<style lang="scss" scoped>
  .list-item {
    height: 24px;
    box-sizing: border-box;

    &:hover {
      background-color: #ebf7ff;
    }
  }

  .text-container {
    display: inline-block;
    width: calc(100% - 22px);
    vertical-align: middle;
  }

  .icon {
    visibility: hidden;
    padding-left: 8px;
    cursor: pointer;
    user-select: none;
  }

  .height-24 {
    height: 24px;
  }

  .list-item-even {
    background-color: #f4f4f4;
  }

  .modified {
    background-color: rgba(151, 255, 100, 0.2);
    font-weight: bold;

    &:hover {
      .icon {
        visibility: visible;
      }
    }
  }
</style>
