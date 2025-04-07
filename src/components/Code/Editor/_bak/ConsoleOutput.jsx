// src/components/Editor/Console.jsx
import React, { useRef, useEffect } from 'react';

const MAX_CONSOLE_LINES = 200;

const Console = ({ messages = [] }) => {
  const consoleRef = useRef(null);
  
  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [messages]);
  
  return (
    <div 
      id="console-output" 
      ref={consoleRef} 
      className="console-container"
    >
      {messages.slice(-MAX_CONSOLE_LINES).map((msg, index) => (
        <pre key={index} className={msg.type || 'log'}>
          {msg.text}
        </pre>
      ))}
    </div>
  );
};

export default Console;