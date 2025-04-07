// src/components/Connection/ConnectionPanel.jsx
import React, { useState } from 'react';
import { useWebChuck } from '../../contexts/WebChuckContextProvider.js';
import { FaPlug, FaPowerOff } from 'react-icons/fa';
import SessionInfo from './SessionInfo';
import './ConnectionPanel.css';

const ConnectionPanel = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { isConnected, connect, disconnect, sessionId } = useWebChuck();
  
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connect();
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleDisconnect = () => {
    disconnect();
  };
  
  return (
    <div className="connection-panel">
      <div className="connection-controls">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        
        {!isConnected ? (
          <button 
            id="connect-server-btn"
            className="connect-btn"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            <FaPlug /> {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        ) : (
          <button 
            className="disconnect-btn"
            onClick={handleDisconnect}
          >
            <FaPowerOff /> Disconnect
          </button>
        )}
      </div>
      
      {isConnected && sessionId && (
        <SessionInfo sessionId={sessionId} />
      )}
    </div>
  );
};

export default ConnectionPanel;