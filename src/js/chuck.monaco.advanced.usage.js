monaco.editor.defineTheme('chuck-dark', {
  base: 'vs-dark',
  rules: [
    { token: 'operator', foreground: 'FFA500' },
    { token: 'type.identifier', foreground: '4EC9B0' },
    { token: 'comment', foreground: '608B4E' }
  ]
});
// new MonacoWebpackPlugin({
//   languages: ['chuck'], // Only include ChucK
//   features: ['coreCommands', 'find']
// })
