<template>
  <div>
    <span v-if="noValidationMessages">OK</span>

    <Poptip v-else trigger="hover" popper-class="text-left" transfer>
      <div slot="content">
        <div v-for="msgType of msgTypes" :key="msgType">
          <div v-for="msg of msgTypeMap[msgType]" :key="msg.text">
            <Badge :status="badgeStatusByMsgType[msgType]" />
            <span>{{ msg.text }}</span>
          </div>
        </div>
      </div>

      <Tag :color="tagType">
        {{ tagLabel }}
      </Tag>
    </Poptip>
  </div>
</template>

<script>
import groupBy from 'lodash/groupBy';

import constants from '@/constants';

const { validationMessageType: msgType } = constants;

const msgTypes = [msgType.ERROR, msgType.WARNING, msgType.INFO];

const badgeStatusByMsgType = {
  [msgType.ERROR]: 'error',
  [msgType.WARNING]: 'warning',
  [msgType.INFO]: 'default',
};

export default {
  name: 'entity-status',
  props: ['entity'],
  data() {
    return {
      msgTypes,
      badgeStatusByMsgType,
    };
  },
  computed: {
    noValidationMessages() {
      return !this.entity.validationMessages.length;
    },
    tagType() {
      if (this.msgTypeMap[msgType.ERROR]) return 'error';
      if (this.msgTypeMap[msgType.WARNING]) return 'warning';

      return 'default';
    },
    tagLabel() {
      if (this.msgTypeMap[msgType.ERROR]) return 'ERR';
      if (this.msgTypeMap[msgType.WARNING]) return 'WARN';

      return 'INFO';
    },
    msgTypeMap() {
      return groupBy(this.entity.validationMessages, 'type');
    },
  },
};
</script>
