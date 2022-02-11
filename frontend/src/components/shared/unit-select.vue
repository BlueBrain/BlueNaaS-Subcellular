<template>
  <i-select ref="select" v-model="unitStr" @on-change="onChange">
    <OptionGroup v-for="(units, groupType) in unitGroups" :key="groupType" :label="unitTypeLabel[groupType]">
      <i-option v-for="unit in units" :key="unit.val" :value="unit.val">
        {{ unit.val }}
      </i-option>
    </OptionGroup>
  </i-select>
</template>

<script>
import groupBy from 'lodash/groupBy'
import get from 'lodash/get'

import constants from '../../constants'

const { UnitType } = constants

const unitTypeLabel = {
  [UnitType.VOL_SIZE]: 'Vol. size',
  [UnitType.SURF_SIZE]: 'Surf. size',
  [UnitType.VOL_REAC_RATE]: 'Vol. reac rate',
  [UnitType.SURF_REAC_RATE]: 'Surf. reac rate',
  [UnitType.TIME]: 'Time',
}

export default {
  name: 'unit-select',
  props: ['value'],
  data() {
    return {
      unitStr: get(this.value, 'val'),
      unitTypeLabel,
      unitGroups: groupBy(constants.units, 'type'),
    }
  },
  methods: {
    onChange(unitStr) {
      if (!unitStr) return
      this.$emit('input', {
        val: unitStr,
        type: constants.units.find((u) => u.val === unitStr).type,
      })
    },
    focus() {
      this.$refs.select.$el.querySelector('.ivu-select-selection').focus()
    },
  },
  watch: {
    value(unit) {
      this.unitStr = get(unit, 'val')
    },
  },
}
</script>
