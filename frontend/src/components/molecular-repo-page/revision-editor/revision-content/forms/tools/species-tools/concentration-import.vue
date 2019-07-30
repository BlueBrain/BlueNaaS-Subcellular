
<template>
  <div>
    <Steps
      class="mb-24"
      :current="step"
    >
      <Step
        title="Upload a file"
        icon="ios-cloud-upload"
      />
      <Step
        title="Configure"
        icon="ios-hammer"
      />
      <Step
        title="Import"
        icon="ios-git-merge"
      />
    </Steps>

    <transition
      name="fade-enter"
      mode="out-in"
    >
      <file-import
        v-if="step === 0"
        key="load"
        :file-formats="importFileFormats"
        @on-file-read="onFileRead"
      />

      <div
        v-else-if="step === 1"
        key="configure"
        :step="1"
      >
        <i-button
          class="mb-24"
          @click="init"
        >
          &lt; Back to file upload
        </i-button>

        <i-form :label-width="140">
          <FormItem label="Match molecules by">
            <Row :gutter="12" type="flex">
              <i-col span="11">
                <i-select
                  v-model="config.match.molecule.prop"
                  placeholder="Select molecule property"
                >
                  <i-option
                    v-for="(label, prop) in moleculeProp"
                    :key="prop"
                    :value="prop"
                  >{{ label }}</i-option>
                </i-select>
              </i-col>
              <i-col span="2" class="text-center">from</i-col>
              <i-col span="11">
                <i-select
                  v-model="config.match.molecule.tableColumn"
                  placeholder="Select table column"
                  filterable
                >
                  <i-option
                    v-for="tableColumn in molAvailableTableColumns"
                    :key="tableColumn"
                    :value="tableColumn"
                  >{{ tableColumn }}</i-option>
                </i-select>
              </i-col>
            </Row>
          </FormItem>

          <FormItem label="Structures mapping">
            <Row
              v-for="(structureMap, index) in config.match.structures"
              :key="structureMap.name + structureMap.tableColumn"
              :gutter="12"
              type="flex"
            >
              <i-col span="10">
                <i-input readonly :value="structureMap.name"/>
              </i-col>
              <i-col span="2" class="text-center">&lt;-&gt;</i-col>
              <i-col span="10">
                <i-input readonly :value="structureMap.tableColumn"/>
              </i-col>
              <i-col span="2">
                <i-button
                  type="warning"
                  icon="md-close"
                  long
                  @click="removeStructureMapping(index)"
                />
              </i-col>
            </Row>

            <Row :gutter="12" type="flex">
              <i-col span="10">
                <i-select
                  v-model="structureMapping.name"
                  placeholder="Select structure"
                  filterable
                >
                  <i-option
                    v-for="structureName in availableStructureNames"
                    :key="structureName"
                    :value="structureName"
                  >{{ structureName }}</i-option>
                </i-select>
              </i-col>
              <i-col span="2" class="text-center">&lt;-&gt;</i-col>
              <i-col span="10">
                <i-select
                  v-model="structureMapping.tableColumn"
                  placeholder="Select table column"
                  filterable
                >
                  <i-option
                    v-for="tableColumn in availableColumns"
                    :key="tableColumn"
                    :value="tableColumn"
                  >{{ tableColumn }}</i-option>
                </i-select>
              </i-col>
              <i-col span="2">
                <i-button
                  type="primary"
                  icon="md-add"
                  long
                  :disabled="!addStructMappingBtnActive"
                  @click="addStructureMapping"
                />
              </i-col>
            </Row>
          </FormItem>

          <FormItem label="Target concentration">
            <i-select
              v-model="config.concSource"
              filterable
              placeholder="Select concentration"
            >
              <i-option
                v-for="concSource in concSources"
                :key="concSource"
                :value="concSource"
              >{{ concSource }}</i-option>
            </i-select>
          </FormItem>
        </i-form>
        <div class="text-right mt-24 mb-12">
          <i-button
            type="primary"
            :disabled="!configValid"
            @click="gotoImportStep"
          >
            Next
          </i-button>
        </div>
      </div>

      <div
        v-else
        key="import"
      >
        <i-button
          class="mb-24"
          @click="gotoConfiguration"
        >
          &lt; Back to configuration
        </i-button>

        <i-table
          class="mb-12"
          :columns="previewColumns"
          :data="concImportCollection"
          stripe
          border
          no-data-text="No concentrations matching your species have been found. Please check import configuration."
        >
          <template
            slot-scope="{ row, index }"
            slot="name"
          >
            <span
              v-if="row.species.length === 1"
            >
              {{ row.species[0].name }}
            </span>
            <RadioGroup
              v-else
              v-model="concImportCollection[index].specIdx"
              vertical
            >
              <Radio
                v-for="(spec, specIdx) in row.species"
                :key="spec.entityId"
                :label="specIdx"
              >{{ spec.name }}</Radio>
            </RadioGroup>
          </template>

          <template
            slot-scope="{ row }"
            slot="definition"
          >
            <bngl-text
              v-for="spec in row.species"
              :key="spec.entityId"
              class="block"
              entity-type="species"
              :value="spec.definition"
            />
          </template>

          <template
            slot-scope="{ row }"
            slot="current-conc"
          >
            <bngl-text
              v-for="spec in row.species"
              :key="spec.entityId"
              class="block"
              entity-type="parameter"
              :value="spec.concentration[config.concSource]"
            />
          </template>

          <template
            slot-scope="{ row, index }"
            slot="new-conc"
          >
            <span
              v-if="row.newConcentrations.length === 1"
            >
              <bngl-text
                entity-type="parameter"
                :value="row.newConcentrations[0]"
              />
            </span>
            <RadioGroup
              v-else
              v-model="concImportCollection[index].newConcentrationIdx"
              vertical
            >
              <Radio
                v-for="(conc, concIdx) in row.newConcentrations"
                :key="conc"
                :label="concIdx"
              >
                <bngl-text
                  entity-type="parameter"
                  :value="conc"
                />
              </Radio>
            </RadioGroup>
          </template>
        </i-table>
      </div>
    </transition>
  </div>
</template>


<script>
  // TODO: split into separate smaller components
  import Csv from 'papaparse';
  import cloneDeep from 'lodash/cloneDeep';

  import modelTools from '@/tools/model-tools';

  import BnglText from '@/components/shared/bngl-text.vue';
  import FileImport from '@/components/shared/file-import.vue';

  const previewColumns = [{
    title: 'Name',
    slot: 'name',
    maxWidth: 120,
  }, {
    title: 'BNGL def',
    slot: 'definition',
  }, {
    title: 'Current conc',
    slot: 'current-conc',
  }, {
    title: 'Imported conc',
    slot: 'new-conc'
  }];

  const importFileFormats = [
    { type: 'CSV', extension: 'csv' },
    { type: 'TSV', extension: 'tsv' },
  ];

  const moleculeProp = {
    name: 'Name',
    geneName: 'Gene name',
    uniProtId: 'UniProt ID',
    pubChemId: 'PubChem id',
    cid: 'CID',
    goId: 'GO ID',
  };

  const structureProp = {
    name: 'Name',
    uniProtId: 'UniProt ID',
    goId: 'GO Cellular Component ID',
  }

  // TODO: more consistent naming
  const defaultConfig = {
    match: {
      molecule: {
        prop: null,
        tableColumn: null,
      },
      structures: [],
    },
    concSource: null,
  };

  export default {
    name: 'concentration-import',
    components: {
      'file-import': FileImport,
      'bngl-text': BnglText,
    },
    props: ['input'],
    data() {
      return {
        importFileFormats,
        moleculeProp,
        structureProp,
        previewColumns,
        concImportCollection: [],
        tableColumns: [],
        config: null,
        step: 0,
        structureMapping: {
          name: null,
          tableColumn: null,
        },
      };
    },
    mounted() {
      this.init();
    },
    methods: {
      init() {
        this.config = cloneDeep(defaultConfig);
        this.data = null;
        this.step = 0;
        this.tableColumns = [];
        this.concImportCollection = [];

        if (this.concSources.length === 1 ) {
          this.config.concSource = this.concSources[0];
        }
      },
      onFileRead({ name, content }) {
        const parseOpts = {
          header: true,
          complete: this.onParseFinish.bind(this),
        };

        Csv.parse(content, parseOpts);
      },
      onParseFinish(table) {
        this.data = table.data;
        this.tableColumns = table.meta.fields.filter(f => f);
        this.step = 1;
      },
      addStructureMapping() {
        this.config.match.structures.push(this.structureMapping);
        this.structureMapping = {
          name: null,
          tableColumn: null,
        };
      },
      removeStructureMapping(index) {
        this.config.match.structures.splice(index, 1);
      },
      gotoImportStep() {
        const model = this.$store.state.revision;
        this.step = 2;
        this.concImportCollection = modelTools
          .buildConcImportCollection(model, this.config, this.data);
      },
      gotoConfiguration() {
        this.step = 1;
      },
      doImport() {
        this.$store.commit('importConcentration', {
          importCollection: this.concImportCollection,
          concSource: this.config.concSource,
        });
      },
    },
    computed: {
      concSources() {
        return this.$store.state.revision.config.concSources;
      },
      showConcSourceSelect() {
        return this.concSources.length > 1 || this.concSources[0] !== 'default';
      },
      structureNames() {
        return this.$store.state.revision.structures.map(s => s.name);
      },
      availableStructureNames() {
        const usedStructureNames = this.config.match.structures.map(s => s.name);
        return this.structureNames.filter(name => !usedStructureNames.includes(name));
      },
      availableColumns() {
        const usedColumns = this.config.match.structures
          .map(s => s.tableColumn)
          .concat(this.config.match.molecule.tableColumn);

        return this.tableColumns.filter(col => !usedColumns.includes(col));
      },
      molAvailableTableColumns() {
        const usedColumns = this.config.match.structures.map(s => s.tableColumn);
        return this.tableColumns.filter(col => !usedColumns.includes(col));
      },
      addStructMappingBtnActive() {
        const mapping = this.structureMapping;
        return mapping.name && mapping.tableColumn;
      },
      configValid() {
        const conf = this.config;
        return conf
          && conf.concSource
          && conf.match.structures.length
          && conf.match.molecule.prop
          && conf.match.molecule.tableColumn;
      },
      readyToImport() {
        return this.configValid
          && this.step === 2
          && this.concImportCollection.length;
      },
    },
    watch: {
      readyToImport(ready) {
        this.$emit('input', ready);
      },
      concSources() {
        this.init();
      },
    },
  }
</script>


<style lang="scss" scoped>
  .ivu-form-item {
    margin-bottom: 12px;
  }
</style>
