// src/components/Layout/MainLayout.jsx
import React from 'react';
import { FaWaveSquare, FaVolumeUp, FaTerminal } from 'react-icons/fa';
import { useWebChuck } from '../../contexts/WebChuckContextProvider.jsx';
import CodeEditor from '../Code/Editor/CodeEditor';
import Console from '../Console/Console';
import Spectrum from '../Visualizer/Spectrum';
import LevelMeter from '../Visualizer/LevelMeter';
import AudioControls from '../Controls/AudioControls';
import './MainLayout.css';

const MainLayout = () => {
  const { consoleOutput, clearConsole } = useWebChuck();
  
  return (
    <div className="main-layout">
      <div className="main-header">
        <div className="app-title">
          <h1>ChucK Web Playground</h1>
        </div>
        <AudioControls />
      </div>
      
      <div className="main-content">
        <div className="editor-panel">
          <CodeEditor />
        </div>
        
        <div className="right-panel">
          <div className="visualizers-panel">
            <div className="visualizer-box">
              <div className="visualizer-header">
                <FaWaveSquare /> <span>Spectrum Analyzer</span>
              </div>
              <div className="visualizer-content">
                <Spectrum />
              </div>
            </div>
            
            <div className="visualizer-box">
              <div className="visualizer-header">
                <FaVolumeUp /> <span>Level Meter</span>
              </div>
              <div className="visualizer-content">
                <LevelMeter />
              </div>
            </div>
          </div>
          
          <div className="console-panel">
            <div className="console-header">
              <div className="console-title">
                <FaTerminal /> <span>Console Output</span>
              </div>
              <button className="clear-console-button" onClick={clearConsole}>
                Clear
              </button>
            </div>
            <Console messages={consoleOutput} />
          </div>
        </div>
      </div>
      
      <div className="main-footer">
        <div className="footer-info">
          <span>ChucK Web Playground</span>
          <span className="dot-separator">•</span>
          <a href="https://chuck.stanford.edu/" target="_blank" rel="noopener noreferrer">
            ChucK Documentation
          </a>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;