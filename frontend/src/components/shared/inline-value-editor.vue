
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
      type="number"
      min="0"
      step="any"
      v-model="currentValue"
      @input="onInput"
      @keyup.enter="onEnter"
      @keyup.esc="onEsc"
      @blur="onBlur"
    >
  </div>
</template>


<script>
  export default {
    name: 'inline-value-editor',
    props: ['value'],
    data() {
      return {
        editMode: false,
        valid: true,
        currentValue: this.value,
      };
    },
    methods: {
      onInput() {
        this.validate();
      },
      onEnter() {
        if (!this.valid) return;

        this.emitChange();
        this.exitEditMode();
      },
      onEsc() {
        this.exitEditMode();
      },
      onBlur() {
        if (this.valid && this.editMode) this.emitChange();

        this.exitEditMode();
      },
      emitChange() {
        this.$emit('input', parseFloat(this.currentValue));
      },
      validate() {
        const parsedNumber = parseFloat(this.currentValue);
        this.valid = typeof parsedNumber === 'number' && parsedNumber >= 0;
      },
      enterEditMode() {
        this.editMode = true;
        this.currentValue = this.value;
        this.validate();
        this.$nextTick(() => this.$refs.input.focus());
      },
      exitEditMode() {
        this.editMode = false;
      },
    },
  };
</script>


<style lang="scss">
  .iva-container {
    height: 100%;

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
