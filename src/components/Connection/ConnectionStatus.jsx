// src/components/Connection/ConnectionStatus.jsx
import React from 'react';

const ConnectionStatus = ({ status, sessionId, onSessionNameChange }) => {
  const [sessionName, setSessionName] = React.useState('');
  
  const handleSetSessionName = () => {
    if (sessionName.trim()) {
      onSessionNameChange(sessionName);
    }
  };
  
  return (
    <div className="connection-panel">
      <div id="connection-status" className="status-indicator">
        {status}
      </div>
      
      {sessionId && (
        <div className="session-info">
          <span id="session-id">Session ID: {sessionId}</span>
          <div className="session-name-controls">
            <input
              id="session-name-input"
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Enter session name"
            />
            <button 
              id="set-session-name-btn"
              onClick={handleSetSessionName}
            >
              Set Name
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;