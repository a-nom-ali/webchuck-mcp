import React from 'react'

const SampleLibrary: React.FC = () => {
  return (
    <div className="section">
      <h2 className="section-title">Sample Library</h2>
      <div className="flex-row">
        <div>
          <div className="search-container">
            <input type="text" id="sample-search" placeholder="Search samples..." />
            <button id="search-samples-btn" disabled>Search</button>
          </div>
          <button id="load-samples-btn" disabled>Load All Samples</button>
          <div className="files-list" id="samples-list"></div>
        </div>
        <div style={{ flex: 1 }}>
          <h3>Upload New Sample</h3>
          <input type="file" id="file-upload" accept=".wav,.aiff,.mp3" />
          <button id="upload-btn" disabled>Upload</button>
          <h3>Record New Sample</h3>
          <div className="record-container">
            <input type="text" id="record-name-input" placeholder="Enter sample name..." />
            <button id="record-sample-btn" className="record-btn" disabled>Record (5s)</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SampleLibrary
