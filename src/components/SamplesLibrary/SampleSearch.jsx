// src/components/SampleLibrary/SampleSearch.jsx
import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import './SampleSearch.css';

const SampleSearch = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchQuery);
  };
  
  return (
    <form className="sample-search-form" onSubmit={handleSubmit}>
      <div className="search-input-container">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search samples..."
          className="sample-search-input"
        />
        <button type="submit" className="sample-search-btn">
          <FaSearch />
        </button>
      </div>
    </form>
  );
};

export default SampleSearch;