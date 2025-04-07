// src/components/SampleLibrary/SampleUpload.jsx
import React, { useState } from 'react';
import { FaUpload, FaTrash } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import './SampleUpload.css';

const SampleUpload = ({ onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [category, setCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };
  
  const validateAndSetFile = (file) => {
    // Check file type
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file');
      return;
    }
    
    // Check file size (limit to 50MB for example)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File is too large. Maximum size is 50MB');
      return;
    }
    
    setSelectedFile(file);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }
    
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      if (category) {
        formData.append('category', category);
      }
      
      await onUpload(formData);
      toast.success('Sample uploaded successfully');
      
      // Reset form
      setSelectedFile(null);
      setCategory('');
      
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };
  
  return (
    <div className="sample-upload-container">
      <h3>Upload New Sample</h3>
      
      <form onSubmit={handleSubmit} className="upload-form">
        <div 
          className={`file-drop-area ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-input"
            className="file-input"
            accept="audio/*"
            onChange={handleFileChange}
          />
          
          {selectedFile ? (
            <div className="selected-file-info">
              <span className="file-name">{selectedFile.name}</span>
              <button 
                type="button" 
                className="remove-file-btn"
                onClick={() => setSelectedFile(null)}
              >
                <FaTrash />
              </button>
            </div>
          ) : (
            <label htmlFor="file-input" className="file-label">
              <FaUpload className="upload-icon" />
              <span>Drag & drop or click to select audio file</span>
            </label>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="category">Category (optional):</label>
          <input
            type="text"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Drums, Piano, Vocals"
            className="category-input"
          />
        </div>
        
        <button 
          type="submit" 
          className="upload-submit-btn"
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Sample'}
        </button>
      </form>
    </div>
  );
};

export default SampleUpload;