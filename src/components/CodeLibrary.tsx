import React from 'react'

const CodeLibrary: React.FC = () => {
  return (
    <div className="section">
      <h2 className="section-title">Code Library</h2>
      <div className="library-controls">
        <button id="save-to-library-btn">Save Current Code</button>
        <button id="load-from-library-btn" disabled>Load Selected</button>
        <button id="delete-from-library-btn" disabled>Delete Selected</button>
        <button id="refresh-library-btn">Refresh List</button>
      </div>
      <div className="library-list-container">
        <select id="library-list" size="5">
          <option value="" disabled>No saved snippets</option>
        </select>
      </div>
    </div>
  )
}

export default CodeLibrary
