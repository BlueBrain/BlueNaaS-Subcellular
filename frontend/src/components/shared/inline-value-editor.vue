
<template>
  <div class="iva-container">
    <span
      v-if="!editMode"
      @click="enterEditMode"
    >
      {{ value ? value : '-' }}
    </span>
    <input
      v-else
      ref="input"
      :class="{invalid: !valid}"
      :type="type"
      :min="min"
      :max="max"
      step="any"
      v-model="currentValue"
      @keyup.enter="onEnter"
      @keyup.esc="onEsc"
      @blur="onBlur"
    >
  </div>
</template>


<script>
  import isNil from 'lodash/isNil';

  export default {
    name: 'inline-value-editor',
    props: {
      value: {
        type: [String, Number],
        required: true,
      },
      type: {
        type: String,
        default: 'text',
      },
      min: Number,
      max: Number,
      minLength: Number,
      maxLength: Number,
    },
    data() {
      return {
        editMode: false,
        enteringEditMode: false,
        currentValue: this.value,
      };
    },
    methods: {
      onEnter() {
        if (!this.valid) return;

        this.emitChange();
        this.exitEditMode();
      },
      onEsc() {
        this.exitEditMode();
      },
      onBlur() {
        // workaround for bug in Firefox where inserted into DOM number input emits blur event
        // see https://bugzilla.mozilla.org/show_bug.cgi?id=981248
        if (this.enteringEditMode) return;

        if (this.valid && this.editMode) this.emitChange();

        this.exitEditMode();
      },
      emitChange() {
        const typedValue = this.type === 'number'
          ? parseFloat(this.currentValue)
          : this.currentValue;

        this.$emit('input', typedValue);
      },
      enterEditMode() {
        this.enteringEditMode = true;
        this.editMode = true;
        this.currentValue = this.value;
        this.$nextTick(() => {
          this.$refs.input.focus();
          this.enteringEditMode = false;
        });
      },
      exitEditMode() {
        this.editMode = false;
      },
    },
    computed: {
      valid() {
        return (isNil(this.min) || this.min <= parseFloat(this.currentValue))
          && (isNil(this.max) || parseFloat(this.currentValue) <= this.max)
          && (isNil(this.minLength) || this.minLength <= this.currentValue.length)
          && (isNil(this.maxLength) || this.currentValue.length <= this.maxLength);
      },
    },
  };
</script>


<style lang="scss">
  .iva-container {
    height: 24px;

    span, input {
      box-sizing: border-box;
      width: 100%;
      height: 100%;
    }

    span {
      line-height: 22px;
      border: 1px solid transparent;
      cursor: pointer;
      padding-left: 6px;
      margin-left: -4px;
      display: inline-block;
      width: calc(100% + 6px);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;

      &:hover {
        border: 1px solid #80848f;
      }
    }

    input {
      height: 24px;
      line-height: 22px;
      width: calc(100% + 6px);
      outline: none;
      padding-left: 6px;
      margin-left: -4px;
      color: #1c2438;
      border: 1px solid #2d8cf0;
      box-shadow: 0 0 3px #2d8cf0;

      &.invalid {
        box-shadow: 0 0 3px #ed3f14;
        border: 1px solid #ed3f14;
      }
    }
  }
</style>
