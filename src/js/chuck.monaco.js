// Register ChucK language
monaco.languages.register({ id: 'chuck' });

// Define syntax rules
monaco.languages.setMonarchTokensProvider('chuck', {
  keywords: [
    'int', 'float', 'time', 'dur', 'void', 'if', 'else', 'while', 'until',
    'for', 'repeat', 'break', 'continue', 'return', 'class', 'extends',
    'public', 'static', 'function', 'fun', 'spork', 'const', 'new', 'now',
    'true', 'false', 'me', 'dac', 'adc', 'blackhole'
  ],

  operators: [
    '=>', '=<', '>', '<', '==', '!=', '<=', '>=', '+', '-', '*', '/', '%',
    '&&', '||', '!', '&', '|', '^', '~', '<<', '>>', '>>>', '@', '=<', '=>'
  ],

  tokenizer: {
    root: [
      // Comments
      [/(\/\/.*)$/, 'comment'],
      [/(\/\*)/, 'comment', '@blockcomment'],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"([^"\\]|\\.)*"/, 'string'],

      // Time literals
      [/(\d+)(::|samp|ms|second|minute|hour|day|week)\b/, ['number', 'type.identifier']],

      // Special operators
      [/=>|=<|==|=<|>=|!=/, 'operator'],

      // Numbers
      [/\d+\.\d+([eE][\-+]?\d+)?/, 'number.float'],
      [/\d+/, 'number'],

      // Keywords and identifiers
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier'
        }
      }],

      // Brackets
      [/[{}()\[\]]/, '@brackets'],

      // Other operators
      [/[;,.]/, 'delimiter']
    ],

    blockcomment: [
      [/.*?\*\//, 'comment', '@pop'],
      [/.*/, 'comment']
    ]
  }
});
