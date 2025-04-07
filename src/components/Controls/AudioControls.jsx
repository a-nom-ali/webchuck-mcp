// src/components/Controls/AudioControls.jsx
import React from 'react';
import { FaPlay, FaStop, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { useWebChuck } from '../../contexts/WebChuckContext';
import './AudioControls.css';

const AudioControls = () => {
  const { isLoaded, isConnected, connect, disconnect } = useWebChuck();
  
  return (
    <div className="audio-controls">
      {isConnected ? (
        <button 
          className="disconnect-button" 
          onClick={disconnect}
          title="Disconnect from audio"
        >
          <FaVolumeMute /> Disconnect
        </button>
      ) : (
        <button 
          className="connect-button" 
          onClick={connect}
          disabled={!isLoaded}
          title={isLoaded ? "Connect to audio" : "WebChuck is loading..."}
        >
          <FaVolumeUp /> Connect
        </button>
      )}
      
      <div className="status-indicator">
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
          <span>{isConnected ? 'Audio Connected' : 'Audio Disconnected'}</span>
      </div>
    </div>
  );
};

export default AudioControls;