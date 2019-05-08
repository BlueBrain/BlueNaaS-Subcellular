
<template>
  <Card>
    <h4 class="title">Display filter:</h4>
    <Row :gutter="6">
      <i-col span="4">
        <i-select
          v-model="ctrl.currentType"
          element-id="te"
          placeholder="Filter"
          :transfer="true"
        >
          <i-option value="include">Include</i-option>
          <i-option value="exclude">Exclude</i-option>
        </i-select>
      </i-col>
      <i-col span="6">
        <i-select
          placeholder="Prop"
          :transfer="true"
          v-model="ctrl.currentProp"
          @on-change="updateFilters"
        >
          <i-option
            v-for="prop in ctrl.props"
            :value="prop"
            :key="prop"
          >{{ prop }}</i-option>
        </i-select>
      </i-col>
      <i-col span="10">
        <i-select
          v-model="ctrl.currentValue"
          :transfer="true"
          filterable
          placeholder="Value"
        >
          <i-option
            v-for="value in ctrl.values"
            :key="value"
            :value="value"
          >{{ value }}</i-option>
        </i-select>
      </i-col>
      <i-col span="4" style="text-align: center">
        <i-button
          long
          type="primary"
          @click="addFilter"
          :disabled=" !ctrl.currentType ||
                      !ctrl.currentProp ||
                      !ctrl.currentValue ||
                      !filterSet[ctrl.currentProp].includes(ctrl.currentValue)"
        >
          Add Filter
        </i-button>
      </i-col>
    </Row>

    <div
      class="current-filters"
      v-if="currentFilters.include.length"
    >
      <h5>Include:</h5>
      <Row :gutter="6">
        <i-col span="16">
          <Tag
            closable
            v-for="filter in currentFilters.include"
            :key="filter.prop + filter.value"
            @on-close="removeFilter('include', filter)"
          >{{ filter.prop }}: {{ filter.value }}</Tag>
        </i-col>
        <i-col
          span="8"
          class="text-right"
          v-if="currentFilters.include.length > 1"
        >
          <RadioGroup
            type="button"
            v-model="ctrl.includeAlgorythm"
            @on-change="onAlgorythmChange"
          >
            <Radio label="union"/>
            <Radio label="intersection"/>
          </RadioGroup>
        </i-col>
      </Row>
    </div>

    <div
      class="current-filters"
      v-if="currentFilters.exclude.length"
    >
      <h5 class="h5">Exclude:</h5>
      <Row :gutter="6">
        <i-col span="16">
          <Tag
            closable
            v-for="filter in currentFilters.exclude"
            :key="filter.prop + filter.value"
            @on-close="removeFilter('exclude', filter)"
          >
            {{ filter.prop }}: {{ filter.value }}
          </Tag>
        </i-col>
        <i-col
          span="8"
          class="text-right"
          v-if="currentFilters.exclude.length > 1"
        >
          <RadioGroup
            type="button"
            v-model="ctrl.excludeAlgorythm"
            @on-change="onAlgorythmChange"
          >
            <Radio label="union"/>
            <Radio label="intersection"/>
          </RadioGroup>
        </i-col>
      </Row>
    </div>

    <Row
      class="reset-btn-container"
      :gutter="6"
      v-if="currentFilters.include.length || currentFilters.exclude.length"
    >
      <i-col
        span="4"
        push="20"
      >
        <i-button
          long
          @click="resetFilters"
        >Reset filters</i-button>
      </i-col>
    </Row>

  </Card>
</template>


<script>
  import store from '@/store';

  export default {
    name: 'neuron-prop-filter',
    data() {
      return {
        ctrl: {
          currentType: '',
          currentProp: '',
          currentValue: '',
          props: [],
          values: [],
          includeAlgorythm: 'union',
          excludeAlgorythm: 'union',
        },
        currentFilters: {
          include: [],
          exclude: [],
          includeUnion: true,
          excludeUnion: true,
        },
        filterSet: {},
      };
    },
    mounted() {
      store.$on('initNeuronPropFilter', this.initFilters);
    },
    methods: {
      initFilters() {
        const { neurons, neuronProps } = store.state.circuit;
        const neuronSample = neurons[0];

        this.filterSet = neuronProps.reduce((filterSet, propName, propIndex) => {
          const filterPropsToSkip = ['x', 'y', 'z'];
          if (filterPropsToSkip.includes(propName)) return filterSet;

          const propType = typeof neuronSample[propIndex];
          if (propType !== 'string' && propType !== 'number') return filterSet;

          const propUniqueValues = Array.from(new Set(neurons.map(n => n[propIndex])));
          if (propUniqueValues.length > 1000) return filterSet;

          return Object.assign(filterSet, { [propName]: propUniqueValues.sort() });
        }, {});

        this.ctrl.props = Object.keys(this.filterSet);
        this.updateFilters();
      },
      onAlgorythmChange() {
        this.currentFilters.includeUnion = this.ctrl.includeAlgorythm === 'union';
        this.currentFilters.excludeUnion = this.ctrl.excludeAlgorythm === 'union';
        this.updateGlobalFilterIndex();
      },
      addFilter() {
        this.currentFilters[this.ctrl.currentType].push({
          prop: this.ctrl.currentProp,
          value: this.ctrl.currentValue,
        });

        this.updateFilters();
        this.updateGlobalFilterIndex();
      },
      removeFilter(type, filter) {
        this.currentFilters[type] = this.currentFilters[type]
          .filter(f => f.value !== filter.value);
        this.updateFilters();
        this.updateGlobalFilterIndex();
      },
      resetFilters() {
        this.currentFilters = {
          include: [],
          exclude: [],
          includeUnion: true,
          excludeUnion: true,
        };
        this.ctrl.includeAlgorythm = 'union';
        this.ctrl.excludeAlgorythm = 'union';
        this.updateFilters();
        this.updateGlobalFilterIndex();
      },
      updateFilters() {
        this.ctrl.currentValue = '';
        const allValues = this.filterSet[this.ctrl.currentProp] || [];

        this.ctrl.values = allValues.filter((value) => {
          if (!this.ctrl.currentProp) return true;

          return !this.currentFilters.include
            .concat(this.currentFilters.exclude)
            .filter(f => f.prop === this.ctrl.currentProp)
            .map(f => f.value)
            .includes(value);
        });
      },
      updateGlobalFilterIndex() {
        // TODO: move to webworker or async separate module
        // to not block UI
        setTimeout(() => {
          const { neurons, neuronPropIndex } = store.state.circuit;
          const filters = this.currentFilters;

          function neuronVisible(neuron) {
            const affectedByFilter = f => neuron[neuronPropIndex[f.prop]] === f.value;

            if (
              filters.include.length &&
              !filters.include[filters.includeUnion ? 'some' : 'every'](affectedByFilter)
            ) return false;

            if (
              filters.exclude.length &&
              filters.exclude[filters.excludeUnion ? 'some' : 'every'](affectedByFilter)
            ) return false;

            return true;
          }

          const { globalFilterIndex } = store.state.circuit;
          neurons.forEach((neuron, index) => {
            globalFilterIndex[index] = neuronVisible(neuron);
          });

          store.$dispatch('propFilterUpdated');
        }, 20);
      },
    },
  };
</script>


<style scoped lang="scss">
  .title {
    margin-bottom: 12px;
  }

  .ivu-card {
    margin-bottom: 12px;
  }

  .current-filters {
    margin-top: 14px;

    h5 {
      margin-bottom: 3px;
    }
  }

  .reset-btn-container {
    margin-top: 14px;
  }
</style>
