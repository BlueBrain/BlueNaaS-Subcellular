
<template>
  <codemirror
    ref="bnglCm"
    :class="{'editable': !readOnly}"
    :value="value"
    :options="cmOptions"
    @input="onCodeChange"
  />
</template>


<script>
  import 'codemirror/lib/codemirror.css';
  import 'codemirror/addon//lint/lint.css';

  import CodeMirror from 'codemirror';
  import 'codemirror/addon/mode/simple';
  import 'codemirror/addon/lint/lint';
  import 'codemirror/addon/display/autorefresh';
  import { codemirror } from 'vue-codemirror';


  const bnglDefinitionModeConfig = {
    start: [{
      regex: /~\w*/,
      token: 'number',
    }, {
      regex: /%\d*/,
      token: 'meta',
    }, {
      regex: /![\d*|+|?]/,
      token: 'link',
    }, {
      regex: /@\w*/,
      token: 'string',
    }, {
      regex: ':',
      token: 'string',
    }, {
      regex: /(\w*)(\()/,
      token: ['atom', null],
    }, {
      regex: /(\()(\w*)/,
      token: [null, 'number'],
    }],
  };

  const bnglParameterModeConfig = {
    start: [{
      regex: /-?(?:0|[1-9]\d*)(?:\.\d*)?(?:[eE][+-]?\d+)?/,
      token: 'number',
    }, {
      regex: /[^/()*+-1-9]?([a-zA-Z_][a-zA-Z_0-9]*)/,
      token: 'variable-3',
    }, {
      regex: /\(|\)/,
      token: 'qualifier',
    }],
  };

  CodeMirror.defineSimpleMode('bngl-function', bnglParameterModeConfig);
  CodeMirror.defineSimpleMode('bngl-parameter', bnglParameterModeConfig);

  CodeMirror.defineSimpleMode('bngl-molecule', bnglDefinitionModeConfig);
  CodeMirror.defineSimpleMode('bngl-species', bnglDefinitionModeConfig);
  CodeMirror.defineSimpleMode('bngl-observable', bnglDefinitionModeConfig);
  CodeMirror.defineSimpleMode('bngl-reaction', bnglDefinitionModeConfig);
  CodeMirror.defineSimpleMode('bngl-diffusion', bnglDefinitionModeConfig);

  export default {
    name: 'bngl-input',
    props: ['value', 'readOnly', 'entityType'],
    components: {
      codemirror,
    },
    mounted() {
      const cm = this.$refs.bnglCm.codemirror;
      cm.setOption('extraKeys', {
        Tab: () => this.$emit('tab'),
        Enter: () => this.$emit('enter'),
      });
    },
    data() {
      return {
        cmOptions: {
          mode: `bngl-${this.entityType}`,
          theme: 'idea',
          scrollbarStyle: 'null',
          readOnly: this.readOnly,
          lint: false,
        },
      };
    },
    methods: {
      onCodeChange(code) {
        this.$emit('input', code);
      },
      refresh() {
        this.$refs.bnglCm.codemirror.refresh();
      },
      focus() {
        this.$refs.bnglCm.codemirror.focus();
      },
    },
  };
</script>


<style lang="scss">
  .CodeMirror {
    color: #464c5b;
    height: auto;
    font-size: 14px;
    line-height: 24px;
    background: transparent;

    transition: border .2s ease-in-out,background .2s ease-in-out,box-shadow .2s ease-in-out;

    pre {
      font-family: 'Source Code Pro', monospace;
    }
  }

  .editable .CodeMirror {
    background: white;
    border: 1px solid #dcdee2;
    border-radius: 3px;

    &:hover {
      border-color: #57a3f3;
    }

    .CodeMirror-focused {
      border-color: #57a3f3;
      box-shadow: 0 0 0 2px rgba(45,140,240,.2);
    }
  }

  .CodeMirror-cursor {
    height: 14px !important;
    top: 5px !important;
  }

  .CodeMirror pre {
    padding: 0 7px;
  }

  .CodeMirror-lines {
    padding: 0;
  }

  .cm-s-idea span.cm-meta { color: #808000; }
  .cm-s-idea span.cm-number { color: #cc5200; }
  .cm-s-idea span.cm-keyword { line-height: 1em; font-weight: bold; color: #000080; }
  .cm-s-idea span.cm-atom { font-weight: bold; color: #2572c4; }
  .cm-s-idea span.cm-def { color: #000000; }
  .cm-s-idea span.cm-variable { color: #0078DE; }
  .cm-s-idea span.cm-variable-2 { color: #964bb4; }
  .cm-s-idea span.cm-variable-3, .cm-s-idea span.cm-type { color: #05ad97; }
  .cm-s-idea span.cm-property { color: black; }
  .cm-s-idea span.cm-operator { color: black; }
  .cm-s-idea span.cm-comment { color: #555555; }
  .cm-s-idea span.cm-string { color: #3d9ca9; }
  .cm-s-idea span.cm-string-2 { color: #008000; }
  .cm-s-idea span.cm-qualifier { color: #555; }
  .cm-s-idea span.cm-error { color: #FF0000; }
  .cm-s-idea span.cm-attribute { color: #0000FF; }
  .cm-s-idea span.cm-tag { color: #000080; }
  .cm-s-idea span.cm-link { color: #2a7dcf; }
  .cm-s-idea .CodeMirror-activeline-background { background: #FFFAE3; }

  .cm-s-idea span.cm-builtin { color: #30a; }
  .cm-s-idea span.cm-bracket { color: #cc7; }

  .cm-s-idea .CodeMirror-matchingbracket { outline:1px solid grey; color:black !important; }

  .CodeMirror-hints.idea {
    font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;
    color: #616569;
    background-color: #ebf3fd !important;
  }

  .CodeMirror-hints.idea .CodeMirror-hint-active {
    background-color: #a2b8c9 !important;
    color: #5c6065 !important;
  }
</style>
