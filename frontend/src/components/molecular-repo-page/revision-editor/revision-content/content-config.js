
import get from 'lodash/get';

import constants from '@/constants';

import BnglText from '@/components/shared/bngl-text.vue';

const { EntityType } = constants;

const Type = {
  EDITOR: 'editor',
  VIEWER: 'viewer',
};

/**
 * Create a column config for concentrations given a list of concentration sources.
 * End configuration will have concentration source headers grouped under 'concentration' header.
 * In case revision isn't supposed to have multiple concentrations -
 * `default` concentration source will be used, resulting configuration will not contain
 * any concentration groups.
 *
 * @param {Object} config additional configuration for column config
 * @param {String[]} config.concSources
 */
function getConcentrationColumnConfig(config = {}) {
  const concSources = config.visibleConcSources || config.concSources;

  if (!concSources || concSources.length === 1) {
    const source = get(config, 'concSources[0]', 'default');
    return {
      title: `Concentration ${source !== 'default' ? `(${source})` : ''}`,
      render: (h, params) => h(BnglText, {
        props: {
          entityType: EntityType.PARAMETER,
          value: params.row.concentration[source],
        },
      }),
    };
  }

  return {
    title: 'Concentrations',
    align: 'center',
    children: concSources.map(concSource => ({
        title: concSource,
        render: (h, params) => h(BnglText, {
          props: {
            entityType: EntityType.PARAMETER,
            value: params.row.concentration[concSource],
          },
        }),
      })),
  };
}

function build(configType, structureType, config = {}) {
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
    },
    getConcentrationColumnConfig(config),
    {
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
      maxWidth: 200,
    }, {
      title: 'Rev',
      render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
      maxWidth: 120,
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
      maxWidth: 400,
    }, {
      title: 'Description',
      key: 'description',
      tooltip: true,
      maxWidth: 200,
    }, {
      title: 'Comments',
      key: 'comments',
      tooltip: true,
      maxWidth: 200,
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
      maxWidth: 90,
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
      maxWidth: 90,
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
    },
    getConcentrationColumnConfig(config),
    {
      title: 'Units',
      maxWidth: 120,
      key: 'units',
    }, {
      title: 'Actions',
      maxWidth: 90,
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
      maxWidth: 90,
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
      maxWidth: 90,
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
      maxWidth: 90,
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
      maxWidth: 90,
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
      maxWidth: 90,
      slot: 'actions',
      align: 'center',
    }],
  };

  return configType === Type.VIEWER
    ? revisionSearchColumnConfig[structureType]
    : revisionEditorColumnConfig[structureType];
}


export default {
  build,
  Type,
};
