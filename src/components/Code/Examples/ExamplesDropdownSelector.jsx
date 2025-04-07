// src/components/Code/Examples/ExamplesSelector.jsx
import React, { useState } from 'react';
import { FaBookOpen } from 'react-icons/fa';
import './ExamplesSelector.css';
import { chuckExamples } from './chuckExamples';

const ExamplesSelector = ({ onSelectExample }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSelectExample = (example) => {
    onSelectExample(example);
    setIsOpen(false);
  };
  
  return (
    <div className="examples-selector">
      <button 
        className="examples-button" 
        onClick={() => setIsOpen(!isOpen)}
        title="Browse examples"
      >
        <FaBookOpen /> Examples
      </button>
      
      {isOpen && (
        <div className="examples-dropdown">
          <div className="examples-header">
            <h3>ChucK Examples</h3>
            <button className="close-button" onClick={() => setIsOpen(false)}>×</button>
          </div>
          
          <div className="examples-list">
            {Object.keys(chuckExamples).map(category => (
              <div key={category} className="examples-category">
                <h4>{category}</h4>
                <ul>
                  {chuckExamples[category].map((example, i) => (
                    <li key={i}>
                      <button onClick={() => handleSelectExample(example)}>
                        {example.name}
                      </button>
                      {example.description && (
                        <div className="example-description">{example.description}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamplesSelector;