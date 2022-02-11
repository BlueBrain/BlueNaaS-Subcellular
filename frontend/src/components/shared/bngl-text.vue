<template>
  <span class="bngl-text" v-html="this.html" />
</template>

<script>
import intersection from 'lodash/intersection'
import set from 'lodash/set'
import range from '@/tools/range'

const bnglDefinitionModeConfig = {
  start: [
    {
      regex: /~\w*/,
      token: 'number',
    },
    {
      regex: /%\d*/,
      token: 'meta',
    },
    {
      regex: /![\d*|+|?]/,
      token: 'link',
    },
    {
      regex: /@\w*/,
      token: 'string',
    },
    {
      regex: ':',
      token: 'string',
    },
    {
      regex: /(\w*)(\()/,
      token: ['atom', null],
    },
  ],
}

// TODO: make config consistent with BnglInput
const bnglParameterModeConfig = {
  start: [
    {
      regex: /(^|\s|[(+\-*/^])([a-zA-Z_][a-zA-Z_0-9]*)/,
      token: [null, 'variable-3'],
    },
    {
      regex: /(^|\s|[()+\-*/])(-?)((?:0|[1-9]\d*)(?:\.\d*)?(?:[eE][+-]?\d+)?)/,
      token: [null, null, 'number'],
    },
    {
      regex: /\(|\)/,
      token: 'qualifier',
    },
  ],
}

const typeConfig = {
  function: bnglParameterModeConfig,
  parameter: bnglParameterModeConfig,

  molecule: bnglDefinitionModeConfig,
  species: bnglDefinitionModeConfig,
  observable: bnglDefinitionModeConfig,
  reaction: bnglDefinitionModeConfig,
  diffusion: bnglDefinitionModeConfig,
}

export default {
  name: 'bngl-text',
  props: ['value', 'entityType'],
  data() {
    return {
      html: this.getHtml(),
    }
  },
  methods: {
    processTokenMatch(reMatch, tokenType, reGroupIdx, posOffset) {
      const matchIdx = reMatch.index
      const tokenLength = reMatch[reGroupIdx].length

      const pos = posOffset + matchIdx

      const currentRange = range(pos, pos + tokenLength)

      const overlay = this.tokenRanges.some((tokenRange) => intersection(tokenRange, currentRange).length)

      if (!overlay) {
        set(this.elemPosMap, `${pos}.open`, tokenType)
        set(this.elemPosMap, `${pos + tokenLength}.close`, true)
        this.tokenRanges.push(currentRange)
      }
    },
    buildHtmlFromElemPosMap() {
      let html = ''
      let currentIdx = 0

      const idxs = Object.keys(this.elemPosMap)
        .map((idxStr) => parseInt(idxStr, 10))
        .sort((a, b) => a - b)

      idxs.forEach((idx) => {
        if (currentIdx < idx) {
          html += this.value.slice(currentIdx, idx)
          currentIdx = idx
        }

        const elementOp = this.elemPosMap[idx]
        if (elementOp.close) {
          html += '</span>'
        }

        if (elementOp.open) {
          html += `<span class="bt-${elementOp.open}">`
        }
      })

      if (currentIdx < this.value.length) {
        html += this.value.slice(currentIdx)
      }

      return html
    },
    getHtml() {
      if (!this.value) return ''

      if (typeof this.value !== 'string') throw new Error('Value of String type expected')

      this.elemPosMap = {}
      this.tokenRanges = []

      let reMatch

      const sumStrLengthReducer = (offset, str) => offset + str.length
      const processRuleToken = (tokenType, tokenIdx) => {
        if (!tokenType) return

        const offset = reMatch.slice(1, tokenIdx + 1).reduce(sumStrLengthReducer, 0)

        this.processTokenMatch(reMatch, tokenType, tokenIdx + 1, offset)
      }

      typeConfig[this.entityType].start.forEach((rule) => {
        const r = new RegExp(rule.regex, 'gi')
        reMatch = r.exec(this.value)

        while (reMatch) {
          if (typeof rule.token === 'string') {
            this.processTokenMatch(reMatch, rule.token, 0, 0)
          } else {
            rule.token.forEach(processRuleToken)
          }

          reMatch = r.exec(this.value)
        }
      })

      return this.buildHtmlFromElemPosMap()
    },
  },
  watch: {
    value() {
      this.html = this.getHtml()
    },
  },
}
</script>

<style lang="scss">
.bngl-text {
  color: #464c5b;
  font-size: 14px;
  line-height: 24px;
  background: transparent;
  font-family: 'Source Code Pro', monospace;
  padding: 0 7px;

  .bt-meta {
    color: #808000;
  }
  .bt-number {
    color: #cc5200;
  }
  .bt-keyword {
    line-height: 1em;
    font-weight: bold;
    color: #000080;
  }
  .bt-atom {
    font-weight: bold;
    color: #2572c4;
  }
  .bt-def {
    color: #000000;
  }
  .bt-variable {
    color: #0078de;
  }
  .bt-variable-2 {
    color: #964bb4;
  }
  .bt-variable-3,
  .bt-type {
    color: #05ad97;
  }
  .bt-property {
    color: black;
  }
  .bt-operator {
    color: black;
  }
  .bt-comment {
    color: #555555;
  }
  .bt-string {
    color: #3d9ca9;
  }
  .bt-string-2 {
    color: #008000;
  }
  .bt-qualifier {
    color: #555;
  }
  .bt-error {
    color: #ff0000;
  }
  .bt-attribute {
    color: #0000ff;
  }
  .bt-tag {
    color: #000080;
  }
  .bt-link {
    color: #2a7dcf;
    text-decoration: underline #2a7dcf;
  }

  .bt-builtin {
    color: #30a;
  }
  .bt-bracket {
    color: #cc7;
  }
}
</style>
