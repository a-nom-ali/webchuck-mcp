// src/components/Code/Library/LibraryItem.jsx
import React, { useState } from 'react';
import { FaTrash, FaCode, FaEllipsisH } from 'react-icons/fa';
import { useWebChuck } from '../../../contexts/WebChuckContextProvider.js';
import './LibraryItem.css';

const LibraryItem = ({ item, isSelected, onSelect, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const { runCode } = useWebChuck();

  const handleRunCode = (e) => {
    e.stopPropagation();
    runCode(item.code);
    setShowActions(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      onDelete();
    }
    setShowActions(false);
  };

  return (
    <li 
      className={`library-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="item-name-container">
        <FaCode className="item-icon" />
        <span className="item-name">{item.name}</span>
      </div>
      
      <div className="item-actions">
        <button 
          className="action-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
        >
          <FaEllipsisH />
        </button>
        
        {showActions && (
          <div className="action-dropdown">
            <button className="run-action" onClick={handleRunCode}>Run Code</button>
            <button className="delete-action" onClick={handleDelete}>Delete</button>
          </div>
        )}
      </div>
    </li>
  );
};

export default LibraryItem;