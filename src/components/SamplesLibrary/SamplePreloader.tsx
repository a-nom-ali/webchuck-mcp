import React from 'react'

const SamplePreloader: React.FC = () => {
  return (
    <div className="section">
      <h2 className="section-title">Sample Preloader</h2>
      <div className="sample-selector">
        <select id="sample-family" multiple style={{ width: '100%', height: '100px', overflowY: 'auto' }} size="100%">
          <option value="accordion">Accordion</option>
          <option value="acoustic_bass">Acoustic Bass</option>
          <option value="acoustic_grand_piano">Acoustic Grand Piano</option>
          <option value="acoustic_guitar_nylon">Acoustic Guitar (Nylon)</option>
          <option value="acoustic_guitar_steel">Acoustic Guitar (Steel)</option>
          <option value="alto_sax">Alto Saxophone</option>
          <option value="flute">Flute</option>
          <option value="violin">Violin</option>
        </select>
        <p>Hold Ctrl/Cmd to select multiple</p>
        <button id="preload-samples-btn" disabled>Preload Selected Samples</button>
      </div>
      <div id="preload-status"></div>
    </div>
  )
}

export default SamplePreloader
