import React from 'react'

const ConnectionStatus: React.FC = () => {
  return (
    <div className="section">
      <h2 className="section-title">Connection Status</h2>
      <div className="status" id="connection-status">
        <span className="red">Not connected</span>
      </div>
      <div className="controls-row">
        <button id="connect-webchuck-btn">Connect to WebChucK</button>
        <button id="connect-server-btn" disabled>Connect to Server</button>
      </div>
      <div className="controls-row">
        <label htmlFor="session-name-input">Session Name: </label>
        <input type="text" id="session-name-input" placeholder="Enter name (optional)" disabled />
        <button id="set-session-name-btn" disabled>Set Name</button>
      </div>
      <div id="session-id"></div>
      <p></p>
      {/* Audio Visualization Section */}
      <div className="section subsection">
        <div id="visualizer-container">
          <div className="visualizer-group">
            <h3>Waveform</h3>
            <canvas id="waveform-canvas"></canvas>
          </div>
          <div className="visualizer-group">
            <h3>Spectrum</h3>
            <canvas id="spectrum-canvas"></canvas>
          </div>
          <div className="visualizer-group">
            <h3>Level</h3>
            <canvas id="level-meter-canvas"></canvas>
          </div>
        </div>
      </div>
      <footer></footer>
    </div>
  )
}

export default ConnectionStatus
