
<template>
  <div>
    <Row
      class="mt-12"
      :gutter="12"
    >
      <i-col span="12" offset="12">
        <Poptip
          class="poptip-long"
          v-model="poptipVisible"
          transfer
          width="300"
          placement="left-end"
          title="Merge revision"
        >
          <div slot="content" class="p-6">
            <div class="mt-6">
              <i-select
                v-model="versionKey"
                placeholder="Choose a revision"
                transfer
                @on-change="onVersionKeyChange"
              >
                <i-option
                  v-for="version in versions"
                  :key="version.key"
                  :value="version.key"
                >{{ version.key }}</i-option>
              </i-select>
            </div>
            <div class="mt-12">
              <i-select
                v-model="concSource"
                placeholder="Choose a concentration source"
                transfer
              >
                <i-option
                  v-for="source in concSources"
                  :key="source"
                  :value="source"
                >{{ source }}</i-option>
              </i-select>
            </div>
            <Row
              class="mt-12 mb-6"
              :gutter="12"
            >
              <i-col span="12">
                <i-button
                  long
                  @click="cancelMergeClicked"
                >
                  Cancel
                </i-button>
              </i-col>
              <i-col span="12">
                <i-button
                  type="primary"
                  long
                  :disabled="!versionKey"
                  @click="onMergeBtnClick"
                >
                  Ok
                </i-button>
              </i-col>
            </Row>
          </div>
          <i-button
            type="primary"
            long
            :disabled="disabled"
          >
            Merge with current model
          </i-button>
        </Poptip>
      </i-col>
    </Row>

    <Modal
      v-model="mergeFinishedModalVisible"
      class-name="vertical-center-modal"
      title="Merged successfully"
    >
      <div slot="footer">
        <i-button
          @click="hideModal"
        >
          Cancel
        </i-button>

        <i-button
          class="ml-12"
          type="primary"
          to="/model/meta"
        >
          Go to Model page
        </i-button>
      </div>
    </Modal>
  </div>
</template>


<script>
  export default {
    name: 'revision-merge',
    props: ['versions', 'disabled'],
    data() {
      return {
        versionKey: null,
        concSource: null,
        mergeFinishedModalVisible: false,
        poptipVisible: false,
      };
    },
    methods: {
      getCurrentVersion() {
        return this.versions.find(v => v.key === this.versionKey);
      },
      async onMergeBtnClick() {
        this.poptipVisible = false;
        // TODO: add result validation
        const mergeRevisionActionParams = {
          version: this.getCurrentVersion(),
          concSource: this.concSource,
        };
        await this.$store.dispatch('mergeRevisionWithModel', mergeRevisionActionParams);
        this.versionKey = null;
        this.onVersionKeyChange();
        this.showModal();
      },
      showModal() {
        this.mergeFinishedModalVisible = true;
      },
      hideModal() {
        this.mergeFinishedModalVisible = false;
      },
      onVersionKeyChange() {
        this.$store.dispatch('setRepoQueryHighlightVersionKey', this.versionKey);
      },
      cancelMergeClicked() {
        this.versionKey = null;
        this.concSource = null;
        this.onVersionKeyChange();
        this.poptipVisible = false;
      },
    },
    computed: {
      concSources() {
        return this.$store.state.repoQueryConfig.concSources;
      },
    },
    watch: {
      versions() {
        if (!this.versions.some(v => v.key === this.versionKey)) {
          this.versionKey = null;
        }
      },
    },
  };
</script>
