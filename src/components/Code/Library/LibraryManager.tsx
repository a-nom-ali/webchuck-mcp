// src/components/Code/Library/LibraryManager.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaSync, FaFolder } from 'react-icons/fa';
import apiService from '../../../services/ApiService';
import LibraryItem from './LibraryItem';
import './LibraryManager.css';

const LibraryManager = () => {
  const [libraryItems, setLibraryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);


  useEffect(() => {
    fetchLibraryItems();
  }, []);

  const fetchLibraryItems = async () => {
    try {
      setIsLoading(true);
      const items = await apiService.getLibraryItems();
      setLibraryItems(items);
    } catch (error) {
      toast.error(`Failed to load library: ${error.message}`);
      console.error('Failed to load library:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemDelete = async (id) => {
    try {
      await apiService.deleteLibraryItem(id);
      toast.success('Item deleted successfully');
      // Remove from state
      setLibraryItems(prevItems => prevItems.filter(item => item.id !== id));
      if (selectedItem && selectedItem.id === id) {
        setSelectedItem(null);
      }
    } catch (error) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const handleItemSelect = async (id) => {
    try {
      setIsLoading(true);
      const item = await apiService.getLibraryItem(id);
      setSelectedItem(item);
    } catch (error) {
      toast.error(`Failed to load item: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="library-manager">
      <div className="library-header">
        <h3><FaFolder /> Code Library</h3>
        <button 
          className="refresh-btn" 
          onClick={fetchLibraryItems} 
          disabled={isLoading}
        >
          <FaSync className={isLoading ? 'spinning' : ''} />
        </button>
      </div>

      <div className="library-items-container">
        {libraryItems.length === 0 ? (
          <div className="empty-library">
            {isLoading ? 'Loading...' : 'No code snippets saved yet'}
          </div>
        ) : (
          <ul className="library-items-list">
            {...Array.from(libraryItems || []).map(item => (
              <LibraryItem 
                key={item.id}
                item={item}
                isSelected={selectedItem && selectedItem.id === item.id}
                onSelect={() => handleItemSelect(item.id)}
                onDelete={() => handleItemDelete(item.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {selectedItem && (
        <div className="selected-item-preview">
          <h4>{selectedItem.name}</h4>
          <pre className="code-preview">{selectedItem.code}</pre>
        </div>
      )}
    </div>
  );
};

export default LibraryManager;