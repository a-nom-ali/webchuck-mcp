// src/components/SampleLibrary/SamplesList.jsx
import React, { useState } from 'react';
import { FaPlay, FaStop, FaMusic, FaFolder } from 'react-icons/fa';
import './SamplesList.css';

const SamplesList = ({ samples, isLoading, onSampleSelect, onRefresh }) => {
  const [playingSample, setPlayingSample] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  
  const handlePlay = (sample, e) => {
    e.stopPropagation();
    // Stop current audio if playing
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    
    // Create new audio element
    const audio = new Audio(sample.previewUrl || sample.url);
    setAudioElement(audio);
    
    // Play the sample
    audio.play();
    setPlayingSample(sample.id);
    
    // Reset when done playing
    audio.onended = () => {
      setPlayingSample(null);
    };
  };
  
  const handleStop = (e) => {
    e.stopPropagation();
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setPlayingSample(null);
    }
  };
  
  const groupSamplesByCategory = () => {
    const grouped = {};
    if (samples && samples.forEach)
      samples.forEach(sample => {
        const category = sample.category || 'Uncategorized';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(sample);
      });
    return grouped;
  };
  
  const groupedSamples = groupSamplesByCategory();
  
  if (isLoading) {
    return (
      <div className="samples-loading">
        Loading samples...
      </div>
    );
  }
  
  if (samples.length === 0) {
    return (
      <div className="no-samples">
        <p>No samples found.</p>
        <button className="refresh-btn" onClick={onRefresh}>
          Refresh
        </button>
      </div>
    );
  }
  
  return (
    <div className="samples-list-container">
      {Object.entries(groupedSamples).map(([category, categorySamples]) => (
        <div key={category} className="samples-category">
          <h4 className="category-title">
            <FaFolder className="category-icon" />
            {category}
          </h4>
          <ul className="samples-list">
            {categorySamples.map(sample => (
              <li 
                key={sample.id} 
                className="sample-item"
                onClick={() => onSampleSelect(sample.path)}
              >
                <div className="sample-details">
                  <FaMusic className="sample-icon" />
                  <span className="sample-name">{sample.name}</span>
                </div>
                <div className="sample-actions">
                  {playingSample === sample.id ? (
                    <button className="sample-stop-btn" onClick={(e) => handleStop(e)}>
                      <FaStop />
                    </button>
                  ) : (
                    <button className="sample-play-btn" onClick={(e) => handlePlay(sample, e)}>
                      <FaPlay />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default SamplesList;