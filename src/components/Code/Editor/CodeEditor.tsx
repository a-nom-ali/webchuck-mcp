// src/components/Code/Editor/CodeEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaStop, FaSave, FaCode } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useWebChuck } from '../../../contexts/WebChuckContextProvider.js';
import ExamplesSelector from '../Examples/ExamplesSelector.js';
import './CodeEditor.css';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// @ts-ignore
self.MonacoEnvironment = {
	getWorker(_: any, label: string) {
		if (label === 'json') {
			return new jsonWorker();
		}
		if (label === 'css' || label === 'scss' || label === 'less') {
			return new cssWorker();
		}
		if (label === 'html' || label === 'handlebars' || label === 'razor') {
			return new htmlWorker();
		}
		if (label === 'typescript' || label === 'javascript') {
			return new tsWorker();
		}
		return new editorWorker();
	}
};

monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
const CodeEditor = () => {
  const [code, setCode] = useState('// Write ChucK code here\n');
  const [activeShredId, setActiveShredId] = useState(null);
  const [savedCode, setSavedCode] = useState(null);
  const [fileName, setFileName] = useState('untitled.ck');
  const { isConnected, isCompiling, runCode, removeShred } = useWebChuck();
  const editorRef = useRef(null);

  // Load editor when component mounts
  useEffect(() => {
    let editor:any;
    
    const loadEditor = async () => {
      try {
        // Check if we have Monaco editor available
        if (window.monaco) {
          setupMonacoEditor();
        } else {
          // Use basic textarea fallback
          setupBasicEditor();
        }
      } catch (error) {
        console.error('Failed to initialize editor:', error);
        setupBasicEditor();
      }
    };
    
    const setupMonacoEditor = () => {
      // Set up Monaco editor with ChucK syntax highlighting
      editor = window.monaco.editor.create(editorRef.current, {
        value: code,
        language: 'csharp', // Use C# as close approximation for ChucK
        theme: 'vs-dark',
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });
      
      editor.onDidChangeModelContent(() => {
        setCode(editor.getValue());
      });
    };
    
    const setupBasicEditor = () => {
      // Create a basic textarea editor
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.className = 'basic-editor';
      textarea.spellcheck = false;
      
      textarea.addEventListener('input', () => {
        setCode(textarea.value);
      });
      
      // Clear and append
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
        editorRef.current.appendChild(textarea);
      }
    };
    
    loadEditor();
    
    return () => {
      // Clean up editor when component unmounts
      if (editor && editor.dispose) {
        editor.dispose();
      }
    };
  }, []);
  
  const handleRunCode = async () => {
    if (!isConnected) {
      toast.error('Please connect to audio first');
      return;
    }
    
    if (code.trim() === '') {
      toast.error('Please enter some code first');
      return;
    }
    
    // If we have an active shred, remove it first
    if (activeShredId !== null) {
      await removeShred(activeShredId);
    }
    
    // Run the code
    const shredId = await runCode(code);
    
    if (shredId !== null) {
      setActiveShredId(shredId);
      // Save the current code state
      setSavedCode(code);
    }
  };
  
  const handleStopCode = async () => {
    if (activeShredId !== null) {
      await removeShred(activeShredId);
      setActiveShredId(null);
    }
  };
  
  const handleSaveCode = () => {
    try {
      // Create file content
      const fileContent = code;
      
      // Create a blob with the content
      const blob = new Blob([fileContent], { type: 'text/plain' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Saved as ${fileName}`);
    } catch (error) {
      console.error('Failed to save file:', error);
      toast.error('Failed to save file');
    }
  };
  
  const handleExampleSelect = (example) => {
    if (example && example.code) {
      // Check if current code is unsaved
      if (code !== savedCode && code.trim() !== '') {
        if (!window.confirm('You have unsaved changes. Load example anyway?')) {
          return;
        }
      }
      
      setCode(example.code);
      setFileName(`${example.name}.ck`);
      
      // If using Monaco editor
      if (window.monaco && window.monaco.editor) {
        const editorInstance = window.monaco.editor.getEditors()[0];
        if (editorInstance) {
          editorInstance.setValue(example.code);
        }
      }
    }
  };
  
  return (
    <div className="code-editor-container">
      <div className="editor-header">
        <div className="editor-title">
          <FaCode /> <span className="file-name">{fileName}</span>
          // src/components/Code/Editor/CodeEditor.jsx (continued)
          {activeShredId && <span className="active-shred">Running: Shred {activeShredId}</span>}
        </div>
        <div className="editor-controls">
          <ExamplesSelector onSelectExample={handleExampleSelect} />
          <div className="editor-buttons">
            <button
                className={`run-button ${activeShredId ? 'active' : ''}`}
                onClick={handleRunCode}
                disabled={isCompiling}
                title="Run code (Ctrl+Enter)"
            >
              <FaPlay /> Run
            </button>
            <button
                className="stop-button"
                onClick={handleStopCode}
                disabled={!activeShredId || isCompiling}
                title="Stop code"
            >
              <FaStop /> Stop
            </button>
            <button
                className="save-button"
                onClick={handleSaveCode}
                title="Save to file"
            >
              <FaSave /> Save
            </button>
          </div>
        </div>
      </div>

      <div className="editor-content" ref={editorRef}></div>

      <div className="editor-footer">
        <div className="editor-status">
          {isCompiling ? 'Compiling...' : isConnected ? 'Ready' : 'Not connected to audio'}
        </div>
        <div className="editor-info">
          <span className="file-type">ChucK</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;