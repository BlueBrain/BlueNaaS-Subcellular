
<script>
  import get from 'lodash/get';

  import StructureProperties from './secondary-view/structure-properties.vue';
  import ParameterProperties from './secondary-view/parameter-properties.vue';
  import FunctionProperties from './secondary-view/function-properties.vue';
  import MoleculeProperties from './secondary-view/molecule-properties.vue';
  import SpeciesProperties from './secondary-view/species-properties.vue';
  import ObservableProperties from './secondary-view/observable-properties.vue';
  import ReactionProperties from './secondary-view/reaction-properties.vue';
  import DiffusionProperties from './secondary-view/diffusion-properties.vue';


  import SimulationProperties from './secondary-view/simulation-properties.vue';

  import DbModel from './secondary-view/db-model.vue';
  import EntityPropertiesPlaceholder from './secondary-view/entity-properties-placeholder.vue';

  const componentMapByType = {
    structure: StructureProperties,
    parameter: ParameterProperties,
    function: FunctionProperties,
    molecule: MoleculeProperties,
    species: SpeciesProperties,
    observable: ObservableProperties,
    reaction: ReactionProperties,
    diffusion: DiffusionProperties,


    none: EntityPropertiesPlaceholder,
    dbModel: DbModel,
    simulation: SimulationProperties,
  };

  export default {
    name: 'secondary-view',
    render(h) {
      const selectedEntityType = get(this.$store.state.selectedEntity, 'type', 'none');
      return h(componentMapByType[selectedEntityType]);
    },
  };
</script>
