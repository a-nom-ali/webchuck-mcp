// src/components/Editor/Console.jsx
import React, { useRef, useEffect } from 'react';
import { useWebChuck } from '../../contexts/WebChuckContextProvider.js';
import { FaTrash } from 'react-icons/fa';
import './Console.css';

const Console = () => {
  const { consoleMessages, clearConsole } = useWebChuck();
  const consoleRef = useRef(null);
  
  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleMessages]);
  
  return (
    <div className="console-container">
      <div className="console-header">
        <h3>Console Output</h3>
        <button 
          className="clear-console-btn" 
          onClick={clearConsole}
          title="Clear console"
        >
          <FaTrash />
        </button>
      </div>
      
      <div 
        id="console-output" 
        ref={consoleRef} 
        className="console-output"
      >
        {consoleMessages?.length === 0 ? (
          <div className="console-empty">Console output will appear here</div>
        ) : (
          consoleMessages?.map((msg, index) => (
            <pre key={index} className={`console-message ${msg.type || 'log'}`}>
              {msg.text}
            </pre>
          ))
        )}
      </div>
    </div>
  );
};

export default Console;