<template>
  <div v-if="validationMessages.length">
    <h2>
      Errors and conflicts
      <small v-if="validationMessages.length">
        ({{ errMsgNum }} errors, {{ warnMsgNum }} warnings, {{ infoMsgNum }} info messages)
      </small>
    </h2>
    <i-table
      class="mt-12"
      stripe
      height="240"
      no-data-text="Validation passed successfully"
      :columns="columns"
      :data="validationMessages"
    />
  </div>
</template>

<script>
import capitalize from 'lodash/capitalize';
import get from 'lodash/get';

import constants from '@/constants';

const { validationMessageType: msgType } = constants;

const tagType = {
  [msgType.INFO]: 'default',
  [msgType.WARNING]: 'warning',
  [msgType.ERROR]: 'error',
};

const columns = [
  {
    title: '#',
    width: 80,
    render: (h, params) => h('span', params.index + 1),
  },
  {
    title: 'Type',
    width: 120,
    render: (h, params) =>
      h('Tag', {
        domProps: {
          innerHTML: capitalize(params.row.type),
        },
        props: {
          color: tagType[params.row.type],
        },
        class: {
          'small-tag': true,
        },
      }),
    filters: [
      {
        label: capitalize(msgType.INFO),
        value: msgType.INFO,
      },
      {
        label: capitalize(msgType.WARNING),
        value: msgType.WARNING,
      },
      {
        label: capitalize(msgType.ERROR),
        value: msgType.ERROR,
      },
    ],
    filterMethod: (value, row) => row.type === value,
  },
  {
    title: 'Message',
    render: (h, params) => h('span', `${params.row.context}: ${params.row.text}`),
  },
];

export default {
  name: 'error-management',
  data() {
    return {
      columns,
    };
  },
  computed: {
    validationMessages() {
      return get(this.$store.state.revision, 'validationMessages', []);
    },
    infoMsgNum() {
      return this.validationMessages.filter((m) => m.type === msgType.INFO).length;
    },
    warnMsgNum() {
      return this.validationMessages.filter((m) => m.type === msgType.WARNING).length;
    },
    errMsgNum() {
      return this.validationMessages.filter((m) => m.type === msgType.ERROR).length;
    },
  },
};
</script>
