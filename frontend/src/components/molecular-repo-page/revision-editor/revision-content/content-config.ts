import get from 'lodash/get'

import constants from '@/constants'

import BnglText from '@/components/shared/bngl-text.vue'

const Type = {
  EDITOR: 'editor',
  VIEWER: 'viewer',
}

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
function getConcentrationColumnConfig(
  config: {
    visibleConcSources?: any
    concSources?: any
  } = {}
) {
  const concSources = config.visibleConcSources || config.concSources

  if (!concSources || concSources.length === 1) {
    const source = get(config, 'concSources[0]', 'default')
    return {
      title: `Concentration ${source !== 'default' ? `(${source})` : ''}`,
      render: (h, params) =>
        h(BnglText, {
          props: {
            entityType: 'parameter',
            value: params.row.concentration[source],
          },
        }),
    }
  }

  return {
    title: 'Concentrations',
    align: 'center',
    children: concSources.map((concSource) => ({
      title: concSource,
      render: (h, params) =>
        h(BnglText, {
          props: {
            entityType: 'parameter',
            value: params.row.concentration[concSource],
          },
        }),
    })),
  }
}

function build(configType, structureType, config = {}) {
  const revisionSearchColumnConfig = {
    structure: [
      {
        type: 'selection',
        width: 60,
        align: 'center',
      },
      {
        title: 'Name',
        key: 'name',
      },
      {
        title: 'Rev',
        render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
      },
      {
        title: 'Type',
        key: 'type',
        maxWidth: 120,
      },
      {
        title: 'UniProt SL id',
        key: 'uniProtId',
      },
      {
        title: 'GO id',
        key: 'goId',
      },
      {
        title: 'Description',
        key: 'description',
        tooltip: true,
      },
    ],
    molecule: [
      {
        type: 'selection',
        width: 60,
        align: 'center',
      },
      {
        title: 'Name',
        key: 'name',
      },
      {
        title: 'Rev',
        render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
      },
      {
        title: 'BNGL expression',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'molecule',
              value: params.row.definition,
            },
          }),
      },
      {
        title: 'Agent type',
        key: 'agentType',
      },
      {
        title: 'PubChem id',
        key: 'pubChem',
      },
      {
        title: 'CID',
        key: 'cid',
      },
      {
        title: 'UniProt id',
        key: 'uniProtId',
      },
      {
        title: 'Gene name',
        key: 'geneName',
      },
      {
        title: 'Description',
        key: 'description',
        tooltip: true,
      },
      {
        title: 'Comments',
        key: 'comments',
        tooltip: true,
      },
    ],
    species: [
      {
        type: 'selection',
        maxWidth: 60,
        align: 'center',
      },
      {
        title: 'Name',
        maxWidth: 200,
        key: 'name',
      },
      {
        title: 'Rev',
        maxWidth: 120,
        render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
      },
      {
        title: 'BNGL expression',
        key: 'definition',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'species',
              value: params.row.definition,
            },
          }),
      },
      getConcentrationColumnConfig(config),
      {
        title: 'Units',
        maxWidth: 120,
        key: 'units',
      },
    ],
    reaction: [
      {
        type: 'selection',
        width: 60,
        align: 'center',
      },
      {
        title: 'Name',
        key: 'name',
        maxWidth: 200,
      },
      {
        title: 'Rev',
        render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
        maxWidth: 120,
      },
      {
        title: 'BNGL expression',
        key: 'definition',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'reaction',
              value: params.row.definition,
            },
          }),
      },
      {
        title: 'Rate',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'parameter',
              value: params.row.kf,
            },
          }),
        maxWidth: 400,
      },
      {
        title: 'Description',
        key: 'description',
        tooltip: true,
        maxWidth: 200,
      },
      {
        title: 'Comments',
        key: 'comments',
        tooltip: true,
        maxWidth: 200,
      },
    ],
    diffusion: [
      {
        type: 'selection',
        width: 60,
        align: 'centern',
      },
      {
        title: 'Name',
        key: 'name',
      },
      {
        title: 'Rev',
        render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
      },
      {
        title: 'BNGL expression',
        key: 'definition',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'diffusion',
              value: params.row.definition,
            },
          }),
      },
      {
        title: 'Rate',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'parameter',
              value: params.row.rate,
            },
          }),
      },
      {
        title: 'Units',
        key: 'units',
      },
      {
        title: 'Comments',
        key: 'comments',
        tooltip: true,
      },
    ],
    parameter: [
      {
        type: 'selection',
        width: 60,
        align: 'center',
      },
      {
        title: 'Name',
        key: 'name',
      },
      {
        title: 'Rev',
        render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
      },
      {
        title: 'BNGL expression',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'parameter',
              value: params.row.definition,
            },
          }),
      },
      {
        title: 'References',
        key: 'references',
        tooltip: true,
      },
      {
        title: 'Comments',
        key: 'comments',
        tooltip: true,
      },
    ],
    function: [
      {
        type: 'selection',
        width: 60,
        align: 'center',
      },
      {
        title: 'Name',
        key: 'name',
      },
      {
        title: 'Rev',
        render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
      },
      {
        title: 'BNGL expression',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'parameter',
              value: params.row.definition,
            },
          }),
      },
      {
        title: 'Units',
        key: 'units',
      },
      {
        title: 'References',
        key: 'references',
      },
      {
        title: 'Comments',
        key: 'comments',
        tooltip: true,
      },
    ],
    observable: [
      {
        type: 'selection',
        width: 60,
        align: 'center',
      },
      {
        title: 'Name',
        key: 'name',
      },
      {
        title: 'Rev',
        render: (h, params) => h('span', `${params.row.branch}:${params.row.rev}`),
      },
      {
        title: 'BNGL expression',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'observable',
              value: params.row.definition,
            },
          }),
      },
      {
        title: 'Comments',
        key: 'comments',
        tooltip: true,
      },
    ],
  }

  const revisionEditorColumnConfig = {
    structure: [
      {
        type: 'selection',
        width: 60,
        align: 'center',
      },
      {
        title: 'Name',
        key: 'name',
      },
      {
        title: 'Source',
        maxWidth: 140,
        key: 'source',
      },
      {
        title: 'Type',
        key: 'type',
        maxWidth: 120,
      },
      {
        title: 'UniProt SL id',
        key: 'uniProtId',
      },
      {
        title: 'GO id',
        key: 'goId',
      },
      {
        title: 'Description',
        key: 'description',
        tooltip: true,
      },
      {
        title: 'Status',
        maxWidth: 100,
        slot: 'status',
        align: 'center',
      },
      {
        title: 'Actions',
        maxWidth: 90,
        slot: 'actions',
        align: 'center',
      },
    ],
    molecule: [
      {
        type: 'selection',
        width: 60,
        align: 'center',
      },
      {
        title: 'Name',
        key: 'name',
      },
      {
        title: 'Source',
        maxWidth: 140,
        key: 'source',
      },
      {
        title: 'BNGL expression',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'molecule',
              value: params.row.definition,
            },
          }),
      },
      {
        title: 'Agent type',
        key: 'agentType',
        maxWidth: 140,
      },
      {
        title: 'PubChem id',
        key: 'pubChem',
      },
      {
        title: 'CID',
        key: 'cid',
      },
      {
        title: 'UniProt id',
        key: 'uniProtId',
      },
      {
        title: 'Gene name',
        key: 'geneName',
      },
      {
        title: 'Description',
        key: 'description',
        tooltip: true,
      },
      {
        title: 'Comments',
        key: 'comments',
        tooltip: true,
      },
      {
        title: 'Status',
        maxWidth: 100,
        slot: 'status',
        align: 'center',
      },
      {
        title: 'Actions',
        maxWidth: 90,
        slot: 'actions',
        align: 'center',
      },
    ],
    species: [
      {
        type: 'selection',
        width: 60,
        align: 'center',
      },
      {
        title: 'Name',
        maxWidth: 200,
        key: 'name',
      },
      {
        title: 'BNGL expression',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'species',
              value: params.row.definition,
            },
          }),
      },
      {
        title: 'Source',
        maxWidth: 140,
        key: 'source',
      },
      getConcentrationColumnConfig(config),
      {
        title: 'Units',
        maxWidth: 120,
        key: 'units',
      },
      {
        title: 'Status',
        maxWidth: 100,
        slot: 'status',
        align: 'center',
      },
      {
        title: 'Actions',
        maxWidth: 90,
        slot: 'actions',
        align: 'center',
      },
    ],
    reaction: [
      {
        type: 'selection',
        width: 60,
        align: 'center',
      },
      {
        title: 'Name',
        key: 'name',
      },
      {
        title: 'Source',
        maxWidth: 140,
        key: 'source',
      },
      {
        title: 'BNGL expression',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'reaction',
              value: params.row.definition,
            },
          }),
      },
      {
        title: 'Rate',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'parameter',
              value: `${params.row.kf}${params.row.kr ? `, ${params.row.kr}` : ''}`,
            },
          }),
      },
      {
        title: 'Description',
        key: 'description',
        tooltip: true,
      },
      {
        title: 'Comments',
        key: 'comments',
        tooltip: true,
      },
      {
        title: 'Status',
        maxWidth: 100,
        slot: 'status',
        align: 'center',
      },
      {
        title: 'Actions',
        maxWidth: 90,
        slot: 'actions',
        align: 'center',
      },
    ],
    diffusion: [
      {
        type: 'selection',
        width: 60,
        align: 'centern',
      },
      {
        title: 'Name',
        key: 'name',
      },
      {
        title: 'Source',
        maxWidth: 140,
        key: 'source',
      },
      {
        title: 'BNGL expression',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'diffusion',
              value: params.row.definition,
            },
          }),
      },
      {
        title: 'Rate',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'parameter',
              value: params.row.rate,
            },
          }),
      },
      {
        title: 'Units',
        key: 'units',
      },
      {
        title: 'Comments',
        key: 'comments',
        tooltip: true,
      },
      {
        title: 'Status',
        maxWidth: 100,
        slot: 'status',
        align: 'center',
      },
      {
        title: 'Actions',
        maxWidth: 90,
        slot: 'actions',
        align: 'center',
      },
    ],
    parameter: [
      {
        type: 'selection',
        width: 60,
        align: 'center',
      },
      {
        title: 'Name',
        key: 'name',
      },
      {
        title: 'Source',
        maxWidth: 140,
        key: 'source',
      },
      {
        title: 'BNGL expression',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'parameter',
              value: params.row.definition,
            },
          }),
      },
      {
        title: 'References',
        key: 'references',
        tooltip: true,
      },
      {
        title: 'Comments',
        key: 'comments',
        tooltip: true,
      },
      {
        title: 'Status',
        maxWidth: 100,
        slot: 'status',
        align: 'center',
      },
      {
        title: 'Actions',
        maxWidth: 90,
        slot: 'actions',
        align: 'center',
      },
    ],
    function: [
      {
        type: 'selection',
        width: 60,
        align: 'center',
      },
      {
        title: 'Name',
        key: 'name',
      },
      {
        title: 'Source',
        maxWidth: 140,
        key: 'source',
      },
      {
        title: 'BNGL expression',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'function',
              value: params.row.definition,
            },
          }),
      },
      {
        title: 'Units',
        key: 'units',
      },
      {
        title: 'References',
        key: 'references',
      },
      {
        title: 'Comments',
        key: 'comments',
        tooltip: true,
      },
      {
        title: 'Status',
        maxWidth: 100,
        slot: 'status',
        align: 'center',
      },
      {
        title: 'Actions',
        maxWidth: 90,
        slot: 'actions',
        align: 'center',
      },
    ],
    observable: [
      {
        type: 'selection',
        width: 60,
        align: 'center',
      },
      {
        title: 'Name',
        key: 'name',
      },
      {
        title: 'Source',
        maxWidth: 140,
        key: 'source',
      },
      {
        title: 'BNGL expression',
        render: (h, params) =>
          h(BnglText, {
            props: {
              entityType: 'observable',
              value: params.row.definition,
            },
          }),
      },
      {
        title: 'Status',
        maxWidth: 100,
        slot: 'status',
        align: 'center',
      },
      {
        title: 'Actions',
        maxWidth: 90,
        slot: 'actions',
        align: 'center',
      },
    ],
  }

  return configType === Type.VIEWER
    ? revisionSearchColumnConfig[structureType]
    : revisionEditorColumnConfig[structureType]
}

export default {
  build,
  Type,
}
