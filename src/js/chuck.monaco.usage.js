// Initialize editor with ChucK support
const editor = monaco.editor.create(document.getElementById('container'), {
  value: `// ChucK Hello World
dac => SinOsc s => blackhole;
440 => s.freq;
1::second => now;
`,
  language: 'chuck',
  theme: 'vs-dark'
});
