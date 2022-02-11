<template>
  <div class="inline-block">
    <Dropdown transfer trigger="click" @on-click="onConcDropdownClick">
      <Button class="mt-12 mr-24">
        Concentrations
        <Icon type="ios-arrow-down"></Icon>
      </Button>
      <DropdownMenu slot="list">
        <DropdownItem name="edit">Edit</DropdownItem>
        <DropdownItem name="import">Import from file</DropdownItem>
      </DropdownMenu>
    </Dropdown>

    <div v-if="globalConcSources.length > 1" class="inline-block">
      <span class="visible-conc-label inline-block mr-6 mt-12"> Show conc: </span>
      <i-select
        class="conc-sources-select mt-12"
        v-model="visibleConcSources"
        placeholder="Select concentrations to show"
        multiple
        transfer
        @on-change="onVisibleConcSourcesChange"
      >
        <i-option v-for="source in sources" :key="source" :value="source">{{ source }}</i-option>
      </i-select>
    </div>

    <Modal title="Edit revision concentrations" v-model="editModalVisible" class-name="vertical-center-modal">
      <div slot="footer">
        <i-button type="primary" @click="closeEditModal"> Ok </i-button>
      </div>

      <p>Click on concentration to rename it.</p>
      <div class="source-container mt-12">
        <div class="mt-12" v-for="(source, sourceIndex) in sources" :key="source">
          <Row :gutter="12" class="line-border mb-6">
            <i-col span="22">
              <inline-value-editor v-model="sources[sourceIndex]" @input="renameSource(sourceIndex, $event)" />
            </i-col>
            <i-col span="2" class="text-right">
              <i-button
                type="text"
                icon="md-close"
                :disabled="sources.length === 1"
                @click="removeSource(sourceIndex)"
              />
            </i-col>
          </Row>
        </div>
      </div>

      <i-button class="mt-12" type="primary" @click="addSource"> Add new concentration </i-button>
    </Modal>

    <Modal
      title="Import concentrations from a file"
      v-model="importModalVisible"
      class-name="vertical-center-modal"
      width="860"
    >
      <div slot="footer">
        <i-button @click="closeImportModal"> Cancel </i-button>
        <i-button type="primary" :disabled="!importBtnAvailable" @click="onImportBtnClick"> Import </i-button>
      </div>
      <concentration-import ref="concImport" v-model="importBtnAvailable" />
    </Modal>
  </div>
</template>

<script>
import findUniqName from '@/tools/find-uniq-name'
import InlineValueEditor from '@/components/shared/inline-value-editor'
import ConcentrationImport from './species-tools/concentration-import.vue'

export default {
  name: 'species-tools',
  data() {
    return {
      editModalVisible: false,
      importModalVisible: false,
      importBtnAvailable: false,
      visibleConcSources: [],
      sources: [],
    }
  },
  components: {
    'inline-value-editor': InlineValueEditor,
    'concentration-import': ConcentrationImport,
  },
  mounted() {
    this.init()
  },
  methods: {
    initEditModal() {
      this.init()
      this.editModalVisible = true
    },
    initImportModal() {
      this.$refs.concImport.init()
      this.importModalVisible = true
    },
    init() {
      this.sources = this.globalConcSources.slice()
      // by default show only first 5 concentrations
      this.visibleConcSources = this.sources.slice(0, 5)
    },
    closeEditModal() {
      this.editModalVisible = false
    },
    closeImportModal() {
      this.importModalVisible = false
    },
    renameSource(sourceIndex, newSource) {
      setTimeout(
        () =>
          this.$store.dispatch('renameRevConcSource', {
            sourceIndex,
            newSource,
          }),
        40
      )
    },
    removeSource(sourceIndex) {
      this.$store.dispatch('removeRevConcSource', sourceIndex)
    },
    addSource() {
      const sourceNameCollection = this.globalConcSources.map((s) => ({
        name: s,
      }))
      const newSource = findUniqName(sourceNameCollection, 'newSource')

      this.sources.push(newSource)
      setTimeout(() => this.$store.dispatch('addRevConcSource', newSource), 40)
    },
    onVisibleConcSourcesChange(sources) {
      setTimeout(() => this.$store.commit('setRevisionVisibleConcSources', sources), 40)
    },
    onConcDropdownClick(name) {
      if (name === 'edit') {
        this.initEditModal()
      } else {
        this.initImportModal()
      }
    },
    onImportBtnClick() {
      // TODO: this logic should be placed in concentration-import component
      this.$refs.concImport.doImport()
      this.importModalVisible = false
      this.$Notice.success({
        title: 'Import successfull',
        desc: 'Concentrations have been updated',
      })
    },
  },
  computed: {
    globalConcSources() {
      return this.$store.state.revision.config.concSources
    },
  },
  watch: {
    globalConcSources() {
      this.init()
    },
  },
}
</script>

<style lang="scss" scoped>
.source-container {
  min-height: 160px;
}

.conc-sources-select {
  width: 420px;
}
.visible-conc-label {
  vertical-align: middle;
  font-size: 14px;
  line-height: 24px;
}

.line-border {
  border: 1px solid #eaeaea;
}
</style>
