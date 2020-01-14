
<template>
  <div>
    <i-table
      :data="entities"
      :columns="tableColumns"
      stripe
      border
      height="320"
      :loading="loading"
      no-data-text="No data"
      @on-selection-change="onSelectionChange"
    >
      <template
        slot-scope="{ row }"
        slot="actions"
      >
        <i-button
          type="text"
          @click="initEntityEdit(row)"
        >
          Edit
        </i-button>
      </template>

      <template
        slot-scope="{ row }"
        slot="status"
      >
        <entity-status :entity="row" />
      </template>
    </i-table>

    <Row
      :gutter="12"
      type="flex"
    >
      <i-col
        :xs="{span: 24, order: 2}"
        :xl="{span: 16, order: 1}"
      >
        <i-button
          class="mt-12"
          type="primary"
          @click="onAddNewClick"
        >
          Add new
        </i-button>
        <i-button
          class="ml-12 mt-12 mr-24"
          type="warning"
          @click="onRemoveSelectedClick"
        >
          Remove selected
        </i-button>
        <component
          class="inline-block"
          :is="toolByEntityType[entityType]"
        />
      </i-col>
      <i-col
        class="mt-12"
        :xs="{span:24, order: 1}"
        :xl="{span: 8, order: 2}"
      >
        <i-input
          v-model="filterStr"
          clearable
          placeholder="Filter"
        />
      </i-col>
    </Row>

    <Modal
      :title="modalTitle"
      v-model="editFormVisible"
      class-name="vertical-center-modal"
      width="720"
    >
      <div slot="footer">
        <i-button
          @click="editFormVisible = false"
        >
          Cancel
        </i-button>

        <i-button
          type="primary"
          :disabled="!tmpEntity.valid"
          @click="onEditFinish"
        >
          Ok
        </i-button>
      </div>
      <div>
        <component
          ref="form"
          :is="formByEntityType[entityType]"
          :entity-type="entityType"
          v-model="tmpEntity"
        />
      </div>
    </Modal>
  </div>
</template>


<script>
  import capitalize from 'lodash/capitalize';

  import constants from '@/constants';
  import contentConfig from './content-config';
  import Entity from '@/services/entity';
  import objStrSearchFilter from '@/tools/obj-str-search-filter';

  import StructureForm from './forms/structure-form.vue';
  import MoleculeForm from './forms/molecule-form.vue';
  import SpeciesForm from './forms/species-form.vue';
  import ReactionForm from './forms/reaction-form.vue';
  import DiffusionForm from './forms/diffusion-form.vue';
  import ObservableForm from './forms/observable-form.vue';
  import ParameterForm from './forms/parameter-form.vue';
  import FunctionForm from './forms/function-form.vue';

  import EntityStatus from '@/components/shared/entity-status';

  import SpeciesTools from './forms/tools/species-tools.vue';

  const { validationMessageType: msgType } = constants;

  const { EntityType, entityTypeCollectionMap, formMode } = constants;

  const formByEntityType = {
    [EntityType.STRUCTURE]: StructureForm,
    [EntityType.MOLECULE]: MoleculeForm,
    [EntityType.SPECIES]: SpeciesForm,
    [EntityType.REACTION]: ReactionForm,
    [EntityType.DIFFUSION]: DiffusionForm,
    [EntityType.OBSERVABLE]: ObservableForm,
    [EntityType.PARAMETER]: ParameterForm,
    [EntityType.FUNCTION]: FunctionForm,
  };

  const toolByEntityType = {
    [EntityType.SPECIES]: SpeciesTools,
  };

  const searchExcludedProps = ['entityId', 'id', '_id', 'entityType', 'userId'];

  export default {
    name: 'revision-entities',
    props: ['entityType'],
    components: {
      'entity-status': EntityStatus,
    },
    data() {
      return {
        formByEntityType,
        toolByEntityType,
        tableColumns: [],
        selection: [],
        editFormVisible: false,
        tmpEntity: {},
        filterStr: '',
        currentFormMode: '',
      };
    },
    mounted() {
      this.initTableColumnConfig();
    },
    methods: {
      onAddNewClick() {
        const className = `Revision${capitalize(this.entityType)}`;
        this.tmpEntity = new Entity[className](this.revisionConfig);
        this.currentFormMode = formMode.CREATE_NEW;
        this.showEditForm();
      },
      initEntityEdit(entity) {
        this.tmpEntity = Object.assign({}, entity);
        this.currentFormMode = formMode.EDIT;
        this.showEditForm();
      },
      showEditForm() {
        this.editFormVisible = true;
        this.$nextTick(() => {
          this.$refs.form.refresh();
          this.$refs.form.focus();
        });
      },
      hideEditForm() {
        this.editFormVisible = false;
      },
      onEditFinish() {
        this.$store.dispatch('updateRevisionEntity', {
          type: this.entityType,
          entity: this.tmpEntity,
        });
        this.hideEditForm();
      },
      onSelectionChange(selection) {
        this.selection = selection;
      },
      onRemoveSelectedClick() {
        this.$store.dispatch('removeRevisionEntities', {
          type: this.entityType,
          entities: this.selection,
        });
      },
      initTableColumnConfig() {
        this.tableColumns = contentConfig.build(
          contentConfig.Type.EDITOR,
          this.entityType,
          this.revisionConfig
        );
      },
    },
    computed: {
      loading() {
        return this.$store.state.revision.loading;
      },
      entities() {
        return this.$store.state.revision[entityTypeCollectionMap[this.entityType]]
          .filter(e => objStrSearchFilter(this.filterStr, e, { exclude: searchExcludedProps }));
      },
      modalTitle() {
        return this.currentFormMode === formMode.CREATE_NEW ? 'Create new' : 'Edit';
      },
      revisionConfig() {
        return this.$store.state.revision.config;
      },
    },
    watch: {
      revisionConfig: {
        handler() {
          this.initTableColumnConfig();
        },
        deep: true,
      },
    },
  };
</script>
