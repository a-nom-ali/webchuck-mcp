import React from 'react'

const CodeEditor: React.FC = () => {
  return (
    <div className="section">
      <h2 className="section-title">ChucK Code Editor</h2>
      <textarea id="code-editor" defaultValue="// Default ChucK code
SinOsc s =>; dac;
0.5 => s.gain;
220 => s.freq;
2::second => now;
      "></textarea>
      <div className="controls-row">
        <button id="run-btn" disabled>Run Code</button>
        <button id="stop-btn" className="stop" disabled>Stop</button>
        <button id="save-btn" disabled>Save Audio</button>
      </div>
    </div>
  )
}

export default CodeEditor
