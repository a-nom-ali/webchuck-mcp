// src/components/Connection/SessionInfo.jsx
import React, { useState } from 'react';
import { useWebChuck } from '../../contexts/WebChuckContextProvider.js';
import { FaEdit, FaCheck } from 'react-icons/fa';
import './SessionInfo.css';

const SessionInfo = ({ sessionId }) => {
  const [sessionName, setSessionName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { setSessionName: updateSessionName } = useWebChuck();
  
  const handleSetSessionName = () => {
    if (sessionName.trim()) {
      updateSessionName(sessionName);
      setIsEditing(false);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSetSessionName();
    }
  };
  
  return (
    <div className="session-info">
      <div className="session-id">
        Session ID: <span>{sessionId}</span>
      </div>
      
      <div className="session-name-controls">
        {isEditing ? (
          <>
            <input
              id="session-name-input"
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter session name"
              autoFocus
            />
            <button 
              className="set-name-btn"
              onClick={handleSetSessionName}
              disabled={!sessionName.trim()}
            >
              <FaCheck />
            </button>
          </>
        ) : (
          <button 
            className="edit-name-btn"
            onClick={() => setIsEditing(true)}
          >
            <FaEdit /> Set Session Name
          </button>
        )}
      </div>
    </div>
  );
};

export default SessionInfo;