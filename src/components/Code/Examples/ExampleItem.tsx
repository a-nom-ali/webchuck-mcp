// src/components/Code/Examples/ExampleItem.jsx
import React from 'react';
import { FaFileCode } from 'react-icons/fa';
import './ExampleItem.css';

const ExampleItem = ({ example, onSelect }) => {
  return (
    <li className="example-item" onClick={onSelect}>
      <FaFileCode className="example-icon" />
      <div className="example-details">
        <span className="example-name">{example.name}</span>
        {example.description && (
          <span className="example-description">{example.description}</span>
        )}
      </div>
    </li>
  );
};

export default ExampleItem;