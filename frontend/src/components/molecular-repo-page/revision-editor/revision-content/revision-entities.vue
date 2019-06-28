
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
    </i-table>

    <Row class="mt-12" :gutter="12">
      <i-col span="12">
        <i-button
          type="primary"
          @click="onAddNewClick"
        >
          Add new
        </i-button>
        <i-button
          class="ml-12"
          type="warning"
          @click="onRemoveSelectedClick"
        >
          Remove selected
        </i-button>
      </i-col>
      <i-col span="12">
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

  export default {
    name: 'revision-entities',
    props: ['entityType'],
    data() {
      return {
        formByEntityType,
        tableColumns: contentConfig.revisionEditorColumnConfig[this.entityType],
        selection: [],
        editFormVisible: false,
        tmpEntity: {},
        filterStr: '',
        currentFormMode: '',
      };
    },
    methods: {
      onAddNewClick() {
        const className = `Revision${capitalize(this.entityType)}`;
        this.tmpEntity = new Entity[className]();
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
    },
    computed: {
      loading() {
        return this.$store.state.revision.loading;
      },
      entities() {
        return this.$store.state.revision[entityTypeCollectionMap[this.entityType]]
          .filter(e => objStrSearchFilter(this.filterStr, e));
      },
      modalTitle() {
        return this.currentFormMode === formMode.CREATE_NEW ? 'Create new' : 'Edit';
      },
    },
  };
</script>
