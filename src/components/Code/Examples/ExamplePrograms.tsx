import React from 'react'

const ExamplePrograms: React.FC = () => {
  return (
    <div className="section">
      <h2 className="section-title">Example ChucK Programs</h2>
      <div className="controls-row">
        <select id="examples-dropdown">
          <option value="">Select an example...</option>
          <option value="simple-sine">Simple Sine Wave</option>
          <option value="fm-synthesis">FM Synthesis</option>
          <option value="file-playback">File Playback</option>
          <option value="audio-effects">Audio Effects Chain</option>
          <option value="stereo-panning">Stereo Panning</option>
          <option value="sequencer">Simple Sequencer</option>
          <option value="parameter-control">Parameter Control Example</option>
        </select>
        <button id="load-example-btn">Load Example</button>
      </div>
    </div>
  )
}

export default ExamplePrograms
