// src/components/SampleLibrary/SampleLibrary.jsx
import React, { useState, useEffect } from 'react';
import { FaSearch, FaUpload, FaMicrophone } from 'react-icons/fa';
import { useWebChuck } from '../../contexts/WebChuckContextProvider.js';
import apiService from '../../services/apiService';
import SamplesList from './SamplesList';
import SampleSearch from './SampleSearch';
import SampleUpload from './SampleUpload';
import './SampleLibrary.css';

const SampleLibrary = () => {
  const [samples, setSamples] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const { loadSamples } = useWebChuck();
  
  useEffect(() => {
    // Load samples on component mount
    fetchSamples();
  }, []);
  
  const fetchSamples = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getSamples();
      setSamples(data);
    } catch (error) {
      console.error('Failed to fetch samples:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSearchSamples = async (query) => {
    try {
      setIsLoading(true);
      const data = await apiService.searchSamples(query);
      setSamples(data);
    } catch (error) {
      console.error('Sample search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSampleUpload = async (formData) => {
    try {
      await apiService.uploadSample(formData);
      fetchSamples(); // Refresh the list
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };
  
  const handleLoadSample = (samplePath) => {
    loadSamples([samplePath]);
  };
  
  return (
    <div className="sample-library">
      <div className="sample-library-tabs">
        <button 
          className={`tab ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          <FaSearch /> Browse
        </button>
        <button 
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <FaUpload /> Upload
        </button>
        <button 
          className={`tab ${activeTab === 'record' ? 'active' : ''}`}
          onClick={() => setActiveTab('record')}
        >
          <FaMicrophone /> Record
        </button>
      </div>
      
      <div className="sample-library-content">
        {activeTab === 'browse' && (
          <>
            <SampleSearch onSearch={handleSearchSamples} />
            <SamplesList 
              samples={samples}
              isLoading={isLoading}
              onSampleSelect={handleLoadSample}
              onRefresh={fetchSamples}
            />
          </>
        )}
        
        {activeTab === 'upload' && (
          <SampleUpload onUpload={handleSampleUpload} />
        )}
        
        {activeTab === 'record' && (
          <div className="record-container">
            <h3>Record New Sample</h3>
            <p>Recording functionality will be implemented soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SampleLibrary;