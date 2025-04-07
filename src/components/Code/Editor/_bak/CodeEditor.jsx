// src/components/Editor/CodeEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useWebChuck } from '../../contexts/WebChuckContext';
import { FaPlay, FaStop, FaSave } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import apiService from '../../services/apiService';
import './CodeEditor.css';

const DEFAULT_CODE = `// Welcome to WebChucK!
// Click Run to start

SinOsc s => dac;
0.5 => s.gain;

// Play for 1 second
1::second => now;
`;

const CodeEditor = () => {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [isSaving, setIsSaving] = useState(false);
  const [codeLibraryName, setCodeLibraryName] = useState('');
  const editorRef = useRef(null);
  const { isConnected, runCode, stopCode } = useWebChuck();
  
  const handleRunCode = () => {
    if (!isConnected) {
      toast.error('Not connected to server. Please connect first.');
      return;
    }
    runCode(code);
  };
  
  const handleStopCode = () => {
    if (!isConnected) {
      toast.error('Not connected to server. Please connect first.');
      return;
    }
    stopCode();
  };
  
  const handleSaveToLibrary = async () => {
    if (!codeLibraryName.trim()) {
      toast.error('Please enter a name for your code');
      return;
    }
    
    try {
      setIsSaving(true);
      await apiService.saveToLibrary(codeLibraryName, code);
      toast.success(`Saved as "${codeLibraryName}"`);
      setCodeLibraryName('');
    } catch (error) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Optional: If you want to integrate with Monaco or CodeMirror
  // You would add that integration here
  
  return (
    <div className="code-editor-container">
      <div className="editor-toolbar">
        <button 
          className="run-btn" 
          onClick={handleRunCode} 
          disabled={!isConnected}
        >
          <FaPlay /> Run
        </button>
        <button 
          className="stop-btn" 
          onClick={handleStopCode} 
          disabled={!isConnected}
        >
          <FaStop /> Stop
        </button>
        
        <div className="save-controls">
          <input
            type="text"
            value={codeLibraryName}
            onChange={(e) => setCodeLibraryName(e.target.value)}
            placeholder="Enter name to save"
            className="save-name-input"
          />
          <button 
            className="save-btn" 
            onClick={handleSaveToLibrary}
            disabled={isSaving || !codeLibraryName.trim()}
          >
            <FaSave /> {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      
      <textarea
        ref={editorRef}
        id="code-editor"
        className="code-textarea"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck="false"
      />
    </div>
  );
};

export default CodeEditor;