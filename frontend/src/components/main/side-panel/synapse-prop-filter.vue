
<template>
  <Card>
    <h4 class="title">Display filter:</h4>

    <Row :gutter="6">
      <i-col span="4">
        <i-select
          v-model="ctrl.currentType"
          size="small"
          placeholder="Filter"
          :transfer="true"
        >
          <i-option value="include">Include</i-option>
          <i-option value="exclude">Exclude</i-option>
        </i-select>
      </i-col>
      <i-col span="4">
        <i-select
          size="small"
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


      <i-col
        v-if="ctrl.currentPropValueType === 'string'"
        span="12"
      >
        <AutoComplete
          size="small"
          v-model="ctrl.currentValueObj.exactValue"
          :data="ctrl.values"
          :filter-method="valueFilterMethod"
          :transfer="true"
          placeholder="Value"
        ></AutoComplete>
      </i-col>

      <i-col
        v-else-if="ctrl.currentPropValueType === 'number'"
        span="12"
      >
        <Row :gutter="6">
          <i-col span="8">
            <i-select
              v-model="ctrl.currentValueObj.compareOperator"
              size="small"
              placeholder="Operator"
              :transfer="true"
              @on-change="resetCurrentValue"
            >
              <i-option value="equal"> == </i-option>
              <i-option value="less"> &le; </i-option>
              <i-option value="more"> &ge; </i-option>
              <i-option value="range"> range </i-option>
            </i-select>
          </i-col>
          <i-col span="16">
            <div
              v-if="ctrl.currentValueObj.compareOperator === 'equal'"
            >
              <AutoComplete
                v-if="ctrl.values.length < 30"
                size="small"
                v-model="ctrl.currentValueObj.exactValue"
                :data="ctrl.values"
                :filter-method="valueFilterMethod"
                :transfer="true"
                placeholder="Value"
              ></AutoComplete>
              <InputNumber
                v-else
                class="full-width"
                v-model="ctrl.currentValueObj.exactValue"
                size="small"
                :min="ctrl.minValue"
                :max="ctrl.maxValue"
                :placeholder="`${ctrl.minValue} - ${ctrl.maxValue}`"
              />
            </div>
            <InputNumber
              v-else-if="ctrl.currentValueObj.compareOperator === 'less'"
              class="full-width"
              v-model="ctrl.currentValueObj.to"
              size="small"
              :min="ctrl.minValue"
              :max="ctrl.maxValue"
              :placeholder="`${ctrl.minValue} - ${ctrl.maxValue}`"
            />
            <InputNumber
              v-else-if="ctrl.currentValueObj.compareOperator === 'more'"
              class="full-width"
              v-model="ctrl.currentValueObj.from"
              size="small"
              :min="ctrl.minValue"
              :max="ctrl.maxValue"
              :placeholder="`${ctrl.minValue} - ${ctrl.maxValue}`"
            />
            <Row
              v-else-if="ctrl.currentValueObj.compareOperator === 'range'"
              :gutter="6"
            >
              <i-col span="12">
                <InputNumber
                  v-model="ctrl.currentValueObj.from"
                  class="full-width"
                  size="small"
                  :min="ctrl.minValue"
                  :max="ctrl.maxValue"
                  :placeholder="ctrl.minValue.toString()"
                />
              </i-col>
              <i-col span="12">
                <InputNumber
                  v-model="ctrl.currentValueObj.to"
                  class="full-width"
                  size="small"
                  :min="ctrl.minValue"
                  :max="ctrl.maxValue"
                  :placeholder="ctrl.maxValue.toString()"
                />
              </i-col>
            </Row>
          </i-col>
        </Row>
      </i-col>


      <i-col span="4" style="text-align: center">
        <i-button
          size="small"
          long
          type="primary"
          @click="addFilter"
          :disabled="!addFilterBtnEnabled"
        >Add Filter</i-button>
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
            :key="filter.id"
            @on-close="removeFilter('include', filter)"
          >
            {{ filter.prop }}
            {{ ctrl.compareOperatorIcons[filter.compareOperator] }}
            {{ filter.compareOperator === 'range' ? `${filter.from} - ${filter.to}`: '' }}
            {{ filter.compareOperator === 'equal' ? filter.exactValue : '' }}
            {{ filter.compareOperator === 'more' ? filter.from : '' }}
            {{ filter.compareOperator === 'less' ? filter.to : '' }}
          </Tag>
        </i-col>
        <i-col
          span="8"
          class="text-right"
          v-if="currentFilters.include.length > 1"
        >
          <RadioGroup
            type="button"
            size="small"
            v-model="ctrl.includeAlgorythm"
            @on-change="onAlgorythmChange"
          >
            <Radio label="union"></Radio>
            <Radio label="intersection"></Radio>
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
            :key="filter.id"
            @on-close="removeFilter('exclude', filter)"
          >
            {{ filter.prop }}
            {{ ctrl.compareOperatorIcons[filter.compareOperator] }}
            {{ filter.compareOperator === 'range' ? `${filter.from} - ${filter.to}`: '' }}
            {{ filter.compareOperator === 'equal' ? filter.exactValue : '' }}
            {{ filter.compareOperator === 'more' ? filter.from : '' }}
            {{ filter.compareOperator === 'less' ? filter.to : '' }}
          </Tag>
        </i-col>
        <i-col
          span="8"
          class="text-right"
          v-if="currentFilters.exclude.length > 1"
        >
          <RadioGroup
            type="button"
            size="small"
            v-model="ctrl.excludeAlgorythm"
            @on-change="onAlgorythmChange"
          >
            <Radio label="union"></Radio>
            <Radio label="intersection"></Radio>
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
          size="small"
          long
          @click="resetFilters"
        >Reset filters</i-button>
      </i-col>
    </Row>

  </Card>
</template>


<script>
  import store from '@/store';

  const neuronPropsToSkip = ['x', 'y', 'z'];
  const filterPropsToSkip = ['postXCenter', 'postYCenter', 'postZCenter', 'index', 'visible', 'gid'];

  export default {
    name: 'neuron-prop-filter',
    data() {
      return {
        ctrl: {
          currentType: '',
          currentProp: '',
          currentPropValueType: 'string',
          currentValue: '',
          props: [],

          compareOperator: {
            equal: 'equal',
            less: 'less',
            more: 'more',
            range: 'range',
          },

          compareOperatorIcons: {
            equal: '==',
            less: '<=',
            more: '>=',
            range: 'in range',
          },

          currentValueObj: {
            compareOperator: 'equal',
            exactValue: undefined,
            from: undefined,
            to: undefined,
          },
          minValue: null,
          maxValue: null,
          currentPreCell: false,
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
      store.$on('initSynapsePropFilter', this.initFilters);
    },
    methods: {
      initFilters() {
        const { synapses, synapseProps } = store.state;
        const { neuronProps } = store.state.circuit;

        const synapseSample = synapses[0];

        this.filterSet = synapseProps.reduce((filterSet, propName) => {
          if (filterPropsToSkip.includes(propName)) return filterSet;

          const propType = typeof synapseSample[propName];
          if (propType !== 'string' && propType !== 'number') return filterSet;

          const filterSetItem = {};

          const propUniqueValues = Array.from(new Set(synapses.map(n => n[propName])));

          if (propType === 'string') {
            filterSetItem.type = 'string';
          } else if (propType === 'number') {
            filterSetItem.type = 'number';
            filterSetItem.min = Math.min(...propUniqueValues);
            filterSetItem.max = Math.max(...propUniqueValues);
          }

          filterSetItem.uniqueValues = propUniqueValues;
          filterSetItem.uniqueValues.sort();

          return Object.assign(filterSet, { [propName]: filterSetItem });
        }, {});

        neuronProps.forEach((neuronProp) => {
          if (neuronPropsToSkip.includes(neuronProp)) return;

          const propUniqueValues = Array.from(new Set(synapses.map(synapse => store.$get('neuron', synapse.preGid - 1)[neuronProp])));
          propUniqueValues.sort();

          const customPropName = `pre_${neuronProp}`;
          this.filterSet[customPropName] = { uniqueValues: propUniqueValues, preCell: true };
          const filterSetItem = this.filterSet[customPropName];
          const propType = typeof propUniqueValues[0];
          if (propType === 'string') {
            filterSetItem.type = 'string';
          } else if (propType === 'number') {
            filterSetItem.type = 'number';
            filterSetItem.min = Math.min(...propUniqueValues);
            filterSetItem.max = Math.max(...propUniqueValues);
          }
        });

        this.ctrl.props = Object.keys(this.filterSet);
        this.updateFilters();
      },
      onAlgorythmChange() {
        this.currentFilters.includeUnion = this.ctrl.includeAlgorythm === 'union';
        this.currentFilters.excludeUnion = this.ctrl.excludeAlgorythm === 'union';
        this.updateSynapseVisibility();
      },
      addFilter() {
        const filter = Object.assign({
          prop: this.ctrl.currentProp,
          id: Date.now(),
          preCell: this.ctrl.currentPreCell,
        }, this.ctrl.currentValueObj);
        this.currentFilters[this.ctrl.currentType].push(filter);

        this.updateFilters();
        this.updateSynapseVisibility();
      },
      removeFilter(type, filter) {
        this.currentFilters[type] = this.currentFilters[type]
          .filter(f => f.id !== filter.id);

        this.updateFilters();
        this.updateSynapseVisibility();
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
        this.updateSynapseVisibility();
      },
      updateFilters() {
        const filterSetItem = this.filterSet[this.ctrl.currentProp];

        if (!filterSetItem) {
          this.ctrl.values = [];
          return;
        }

        this.ctrl.currentPropValueType = filterSetItem.type;
        this.ctrl.currentPreCell = filterSetItem.preCell;

        this.ctrl.currentValueObj.compareOperator = 'equal';

        this.ctrl.values = filterSetItem.uniqueValues.filter((value) => {
          if (!this.ctrl.currentProp) return true;

          return !this.currentFilters.include
            .concat(this.currentFilters.exclude)
            .filter(f => f.prop === this.ctrl.currentProp)
            .map(f => f.exactValue)
            .includes(value);
        });

        if (filterSetItem.type === 'number') {
          this.ctrl.minValue = filterSetItem.min;
          this.ctrl.maxValue = filterSetItem.max;
        }

        this.resetCurrentValue();
      },
      resetCurrentValue() {
        if (this.ctrl.currentPropValueType === 'string') {
          this.ctrl.currentValueObj.exactValue = '';
        } else {
          this.ctrl.currentValueObj.exactValue = this.ctrl.values.length < 30 ? '' : null;
        }
        this.ctrl.currentValueObj.from = this.ctrl.minValue;
        this.ctrl.currentValueObj.to = this.ctrl.maxValue;
      },
      valueFilterMethod(value, option) {
        if (!option) return false;
        if (!value) return true;

        return option
          .toString()
          .toUpperCase()
          .includes(value.toString().toUpperCase());
      },
      updateSynapseVisibility() {
        // TODO: move to webworker or async separate module
        // to not block UI
        setTimeout(() => {
          const { synapses } = store.state;
          const filters = this.currentFilters;

          function synapseVisible(synapse) {
            const affectedByFilter = (filter) => {
              if (filter.compareOperator === 'equal') {
                if (filter.preCell) {
                  const neuron = store.$get('neuron', synapse.preGid - 1);
                  return neuron[filter.prop.split('_')[1]] === filter.exactValue;
                }

                return synapse[filter.prop] === filter.exactValue;
              } else if (filter.compareOperator === 'more') {
                if (filter.preCell) {
                  const neuron = store.$get('neuron', synapse.preGid - 1);
                  return neuron[filter.prop.split('_')[1]] >= filter.from;
                }

                return synapse[filter.prop] >= filter.from;
              } else if (filter.compareOperator === 'less') {
                if (filter.preCell) {
                  const neuron = store.$get('neuron', synapse.preGid - 1);
                  return neuron[filter.prop.split('_')[1]] <= filter.to;
                }

                return synapse[filter.prop] <= filter.to;
              }

              if (filter.preCell) {
                const neuron = store.$get('neuron', synapse.preGid - 1);
                return neuron[filter.prop.split('_')[1]] >= filter.from &&
                  neuron[filter.prop.split('_')[1]] <= filter.to;
              }

              return synapse[filter.prop] >= filter.from && synapse[filter.prop] <= filter.to;
            };

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

          synapses.forEach((synapse) => { synapse.visible = synapseVisible(synapse); });

          store.$dispatch('synapsePropFilterUpdated');
        }, 20);
      },
    },

    computed: {
      addFilterBtnEnabled() {
        const valObj = this.ctrl.currentValueObj;

        return this.ctrl.currentType && this.ctrl.currentProp &&
          (valObj.compareOperator === 'equal' ?
            this.ctrl.values.includes(valObj.exactValue) :
            true);
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
