// src/components/Console/Console.jsx
import React, { useRef, useEffect } from 'react';
import './Console.css';

const Console = ({ messages }) => {
  const consoleRef = useRef(null);
  
  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [messages]);
  
  return (
    <div className="console-container" ref={consoleRef}>
      {messages?.length === 0 ? (
        <div className="console-empty">No output yet.</div>
      ) : (
        <div className="console-messages">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`console-message ${msg.type}`}
            >
              {msg.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Console;