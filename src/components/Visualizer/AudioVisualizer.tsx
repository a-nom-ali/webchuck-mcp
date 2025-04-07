// src/components/Visualizer/Visualizer.jsx
import React, { useState } from 'react';
import { FaChartBar, FaWaveSquare, FaVolumeUp } from 'react-icons/fa';
import Waveform from './Waveform';
import Spectrum from './Spectrum';
import LevelMeter from './LevelMeter';
import './Visualizer.css';

const Visualizer = () => {
  const [activeView, setActiveView] = useState('waveform');
  
  return (
    <div className="visualizer-container">
      <div className="visualizer-header">
        <h3>Audio Visualizer</h3>
        <div className="visualizer-tabs">
          <button 
            className={`viz-tab ${activeView === 'waveform' ? 'active' : ''}`}
            onClick={() => setActiveView('waveform')}
          >
            <FaWaveSquare /> Waveform
          </button>
          <button 
            className={`viz-tab ${activeView === 'spectrum' ? 'active' : ''}`}
            onClick={() => setActiveView('spectrum')}
          >
            <FaChartBar /> Spectrum
          </button>
          <button 
            className={`viz-tab ${activeView === 'meter' ? 'active' : ''}`}
            onClick={() => setActiveView('meter')}
          >
            <FaVolumeUp /> Level
          </button>
        </div>
      </div>
      
      <div className="visualizer-content">
        {activeView === 'waveform' && <Waveform />}
        {activeView === 'spectrum' && <Spectrum />}
        {activeView === 'meter' && <LevelMeter />}
      </div>
    </div>
  );
};

export default Visualizer;