
import constants from '@/constants';

import BnglText from '@/components/shared/bngl-text.vue';

const { EntityType } = constants;


const revisionEditorColumnConfig = {
  [EntityType.STRUCTURE]: [{
    type: 'selection',
    width: 60,
    align: 'center',
  }, {
    title: 'Name',
    key: 'name',
  }, {
    title: 'Source',
    maxWidth: 140,
    key: 'source',
  }, {
    title: 'Type',
    key: 'type',
    maxWidth: 120,
  }, {
    title: 'UniProt SL id',
    key: 'uniProtId',
  }, {
    title: 'GO id',
    key: 'goId',
  }, {
    title: 'Description',
    key: 'description',
    tooltip: true,
  }, {
    title: 'Actions',
    maxWidth: 80,
    slot: 'actions',
    align: 'center',
  }],
  [EntityType.MOLECULE]: [{
    type: 'selection',
    width: 60,
    align: 'center',
  }, {
    title: 'Name',
    key: 'name',
  }, {
    title: 'Source',
    maxWidth: 140,
    key: 'source',
  }, {
    title: 'BNGL expression',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.MOLECULE,
        value: params.row.definition,
      },
    }),
  }, {
    title: 'Agent type',
    key: 'agentType',
    maxWidth: 140,
  }, {
    title: 'PubChem id',
    key: 'pubChem',
  }, {
    title: 'CID',
    key: 'cid',
  }, {
    title: 'UniProt id',
    key: 'uniProtId',
  }, {
    title: 'Gene name',
    key: 'geneName',
  }, {
    title: 'Description',
    key: 'description',
    tooltip: true,
  }, {
    title: 'Comments',
    key: 'comments',
    tooltip: true,
  }, {
    title: 'Actions',
    maxWidth: 80,
    slot: 'actions',
    align: 'center',
  }],
  [EntityType.SPECIES]: [{
    type: 'selection',
    width: 60,
    align: 'center',
  }, {
    title: 'Name',
    maxWidth: 200,
    key: 'name',
  }, {
    title: 'BNGL expression',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.SPECIES,
        value: params.row.definition,
      },
    }),
  }, {
    title: 'Source',
    maxWidth: 140,
    key: 'source',
  }, {
    title: 'Concentration',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.PARAMETER,
        value: params.row.concentration,
      },
    }),
  }, {
    title: 'Units',
    key: 'units',
  }, {
    title: 'Actions',
    maxWidth: 80,
    slot: 'actions',
    align: 'center',
  }],
  [EntityType.REACTION]: [{
    type: 'selection',
    width: 60,
    align: 'center',
  }, {
    title: 'Name',
    key: 'name',
  }, {
    title: 'Source',
    maxWidth: 140,
    key: 'source',
  }, {
    title: 'BNGL expression',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.REACTION,
        value: params.row.definition,
      },
    }),
  }, {
    title: 'Rate',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.PARAMETER,
        value: `${params.row.kf}${params.row.kr ? `, ${params.row.kr}` : ''}`,
      },
    }),
  }, {
    title: 'Description',
    key: 'description',
    tooltip: true,
  }, {
    title: 'Comments',
    key: 'comments',
    tooltip: true,
  }, {
    title: 'Actions',
    maxWidth: 80,
    slot: 'actions',
    align: 'center',
  }],
  [EntityType.DIFFUSION]: [{
    type: 'selection',
    width: 60,
    align: 'centern',
  }, {
    title: 'Name',
    key: 'name',
  }, {
    title: 'Source',
    maxWidth: 140,
    key: 'source',
  }, {
    title: 'BNGL expression',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.DIFFUSION,
        value: params.row.definition,
      },
    }),
  }, {
    title: 'Rate',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.PARAMETER,
        value: params.row.rate,
      },
    }),
  }, {
    title: 'Units',
    key: 'units',
  }, {
    title: 'Comments',
    key: 'comments',
    tooltip: true,
  }, {
    title: 'Actions',
    maxWidth: 80,
    slot: 'actions',
    align: 'center',
  }],
  [EntityType.PARAMETER]: [{
    type: 'selection',
    width: 60,
    align: 'center',
  }, {
    title: 'Name',
    key: 'name',
  }, {
    title: 'Source',
    maxWidth: 140,
    key: 'source',
  }, {
    title: 'BNGL expression',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.PARAMETER,
        value: params.row.definition,
      },
    }),
  }, {
    title: 'References',
    key: 'references',
    tooltip: true,
  }, {
    title: 'Comments',
    key: 'comments',
    tooltip: true,
  }, {
    title: 'Actions',
    maxWidth: 80,
    slot: 'actions',
    align: 'center',
  }],
  [EntityType.FUNCTION]: [{
    type: 'selection',
    width: 60,
    align: 'center',
  }, {
    title: 'Name',
    key: 'name',
  }, {
    title: 'Source',
    maxWidth: 140,
    key: 'source',
  }, {
    title: 'BNGL expression',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.FUNCTION,
        value: params.row.definition,
      },
    }),
  }, {
    title: 'Units',
    key: 'units',
  }, {
    title: 'References',
    key: 'references',
  }, {
    title: 'Comments',
    key: 'comments',
    tooltip: true,
  }, {
    title: 'Actions',
    maxWidth: 80,
    slot: 'actions',
    align: 'center',
  }],
  [EntityType.OBSERVABLE]: [{
    type: 'selection',
    width: 60,
    align: 'center',
  }, {
    title: 'Name',
    key: 'name',
  }, {
    title: 'Source',
    maxWidth: 140,
    key: 'source',
  }, {
    title: 'BNGL expression',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.OBSERVABLE,
        value: params.row.definition,
      },
    }),
  }, {
    title: 'Actions',
    maxWidth: 80,
    slot: 'actions',
    align: 'center',
  }],
};

const revisionSearchColumnConfig = {
  [EntityType.STRUCTURE]: [{
    type: 'selection',
    width: 60,
    align: 'center',
  }, {
    title: 'Name',
    key: 'name',
  }, {
    title: 'Rev',
    render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
  }, {
    title: 'Type',
    key: 'type',
    maxWidth: 120,
  }, {
    title: 'UniProt SL id',
    key: 'uniProtId',
  }, {
    title: 'GO id',
    key: 'goId',
  }, {
    title: 'Description',
    key: 'description',
    tooltip: true,
  }],
  [EntityType.MOLECULE]: [{
    type: 'selection',
    width: 60,
    align: 'center',
  }, {
    title: 'Name',
    key: 'name',
  }, {
    title: 'Rev',
    render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
  }, {
    title: 'BNGL expression',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.MOLECULE,
        value: params.row.definition,
      },
    }),
  }, {
    title: 'Agent type',
    key: 'agentType',
  }, {
    title: 'PubChem id',
    key: 'pubChem',
  }, {
    title: 'CID',
    key: 'cid',
  }, {
    title: 'UniProt id',
    key: 'uniProtId',
  }, {
    title: 'Gene name',
    key: 'geneName',
  }, {
    title: 'Description',
    key: 'description',
    tooltip: true,
  }, {
    title: 'Comments',
    key: 'comments',
    tooltip: true,
  }],
  [EntityType.SPECIES]: [{
    type: 'selection',
    maxWidth: 60,
    align: 'center',
  }, {
    title: 'Name',
    maxWidth: 200,
    key: 'name',
  }, {
    title: 'Rev',
    maxWidth: 120,
    render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
  }, {
    title: 'BNGL expression',
    key: 'definition',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.SPECIES,
        value: params.row.definition,
      },
    }),
  }, {
    title: 'Concentration',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.PARAMETER,
        value: params.row.concentration,
      },
    }),
  }, {
    title: 'Units',
    maxWidth: 120,
    key: 'units',
  }],
  [EntityType.REACTION]: [{
    type: 'selection',
    width: 60,
    align: 'center',
  }, {
    title: 'Name',
    key: 'name',
  }, {
    title: 'Rev',
    render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
  }, {
    title: 'BNGL expression',
    key: 'definition',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.REACTION,
        value: params.row.definition,
      },
    }),
  }, {
    title: 'Rate',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.PARAMETER,
        value: params.row.kf,
      },
    }),
  }, {
    title: 'Description',
    key: 'description',
    tooltip: true,
  }, {
    title: 'Comments',
    key: 'comments',
    tooltip: true,
  }],
  [EntityType.DIFFUSION]: [{
    type: 'selection',
    width: 60,
    align: 'centern',
  }, {
    title: 'Name',
    key: 'name',
  }, {
    title: 'Rev',
    render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
  }, {
    title: 'BNGL expression',
    key: 'definition',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.DIFFUSION,
        value: params.row.definition,
      },
    }),
  }, {
    title: 'Rate',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.PARAMETER,
        value: params.row.rate,
      },
    }),
  }, {
    title: 'Units',
    key: 'units',
  }, {
    title: 'Comments',
    key: 'comments',
    tooltip: true,
  }],
  [EntityType.PARAMETER]: [{
    type: 'selection',
    width: 60,
    align: 'center',
  }, {
    title: 'Name',
    key: 'name',
  }, {
    title: 'Rev',
    render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
  }, {
    title: 'BNGL expression',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.PARAMETER,
        value: params.row.definition,
      },
    }),
  }, {
    title: 'References',
    key: 'references',
    tooltip: true,
  }, {
    title: 'Comments',
    key: 'comments',
    tooltip: true,
  }],
  [EntityType.FUNCTION]: [{
    type: 'selection',
    width: 60,
    align: 'center',
  }, {
    title: 'Name',
    key: 'name',
  }, {
    title: 'Rev',
    render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
  }, {
    title: 'BNGL expression',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.PARAMETER,
        value: params.row.definition,
      },
    }),
  }, {
    title: 'Units',
    key: 'units',
  }, {
    title: 'References',
    key: 'references',
  }, {
    title: 'Comments',
    key: 'comments',
    tooltip: true,
  }],
  [EntityType.OBSERVABLE]: [{
    type: 'selection',
    width: 60,
    align: 'center',
  }, {
    title: 'Name',
    key: 'name',
  }, {
    title: 'Rev',
    render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
  }, {
    title: 'BNGL expression',
    render: (h, params) => h(BnglText, {
      props: {
        entityType: EntityType.OBSERVABLE,
        value: params.row.definition,
      },
    }),
  }, {
    title: 'Comments',
    key: 'comments',
    tooltip: true,
  }],
};

export default {
  revisionEditorColumnConfig,
  revisionSearchColumnConfig,
};
