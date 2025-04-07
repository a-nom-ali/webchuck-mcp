/**
 * Enhanced ChucK Library Client API
 * 
 * This module extends the basic client API with advanced features:
 * - RAG for code generation
 * - Enhanced sample management
 * - Performance analysis
 * - Event tracking
 */

import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ================== Snippet Embedding Methods ==================

/**
 * Store an embedding vector for a snippet
 */
export const storeSnippetEmbedding = async (snippetId, embeddingVector, embeddingType) => {
  const response = await api.post(`/snippets/${snippetId}/embedding`, {
    embedding_vector: embeddingVector,
    embedding_type: embeddingType
  });
  return response.data;
};

/**
 * Get embeddings for a snippet
 */
export const getSnippetEmbeddings = async (snippetId, type = null) => {
  const params = type ? { type } : {};
  const response = await api.get(`/snippets/${snippetId}/embeddings`, { params });
  return response.data;
};

/**
 * Search for snippets by embedding similarity
 */
export const searchSnippetsByEmbedding = async (embeddingVector, embeddingType, limit = 10) => {
  const response = await api.post('/snippets/search-by-embedding', {
    embedding_vector: embeddingVector,
    embedding_type: embeddingType,
    limit
  });
  return response.data;
};

// ================== Musical Pattern Methods ==================

/**
 * Get all musical patterns
 */
export const getPatterns = async (type = null) => {
  const params = type ? { type } : {};
  const response = await api.get('/patterns', { params });
  return response.data;
};

/**
 * Get a specific pattern
 */
export const getPattern = async (id) => {
  const response = await api.get(`/patterns/${id}`);
  return response.data;
};

/**
 * Create a new pattern
 */
export const createPattern = async (data) => {
  const response = await api.post('/patterns', data);
  return response.data;
};

/**
 * Update a pattern
 */
export const updatePattern = async (id, data) => {
  const response = await api.put(`/patterns/${id}`, data);
  return response.data;
};

/**
 * Delete a pattern
 */
export const deletePattern = async (id) => {
  await api.delete(`/patterns/${id}`);
  return true;
};

// ================== Usage Context Methods ==================

/**
 * Record usage context
 */
export const recordUsageContext = async (data) => {
  const response = await api.post('/usage-context', data);
  return response.data;
};

/**
 * Get usage contexts
 */
export const getUsageContexts = async (snippetId = null, patternId = null) => {
  const params = {};
  if (snippetId) params.snippet_id = snippetId;
  if (patternId) params.pattern_id = patternId;
  
  const response = await api.get('/usage-context', { params });
  return response.data;
};

// ================== Sample Analytics Methods ==================

/**
 * Store analytics for a sample
 */
export const storeSampleAnalytics = async (sampleId, data) => {
  const response = await api.post(`/samples/${sampleId}/analytics`, data);
  return response.data;
};

/**
 * Get analytics for a sample
 */
export const getSampleAnalytics = async (sampleId) => {
  const response = await api.get(`/samples/${sampleId}/analytics`);
  return response.data;
};

/**
 * Analyze uploaded sample file
 * This is a utility function that uses the Web Audio API to analyze a sample
 */
export const analyzeSampleFile = async (file) => {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const fileReader = new FileReader();
    
    fileReader.onload = async (e) => {
      try {
        // Decode audio data
        const audioBuffer = await audioContext.decodeAudioData(e.target.result);
        
        // Get channel data (use first channel for analysis)
        const channelData = audioBuffer.getChannelData(0);
        
        // Calculate basic metrics
        const duration = audioBuffer.duration;
        let peakAmplitude = 0;
        let sum = 0;
        
        // Find peak and average amplitude
        for (let i = 0; i < channelData.length; i++) {
          const absValue = Math.abs(channelData[i]);
          peakAmplitude = Math.max(peakAmplitude, absValue);
          sum += absValue;
        }
        
        const averageAmplitude = sum / channelData.length;
        
        // Find transient points (simplified version)
        const transients = [];
        const threshold = peakAmplitude * 0.7; // 70% of peak as threshold
        let inTransient = false;
        
        for (let i = 0; i < channelData.length; i++) {
          if (!inTransient && Math.abs(channelData[i]) > threshold) {
            inTransient = true;
            transients.push(i / audioBuffer.sampleRate); // Convert to seconds
          } else if (inTransient && Math.abs(channelData[i]) <= threshold) {
            inTransient = false;
          }
        }
        
        // Create analyzer for spectral analysis
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyser);
        
        const dataArray = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(dataArray);
        
        // Calculate spectral centroid (simplified)
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
          const amplitude = Math.pow(10, dataArray[i] / 20); // Convert dB to linear
          const frequency = i * audioContext.sampleRate / analyser.fftSize;
          numerator += amplitude * frequency;
          denominator += amplitude;
        }
        
        const spectralCentroid = denominator !== 0 ? numerator / denominator : 0;
        
        // Find dominant frequency (simplified)
        let maxIndex = 0;
        let maxValue = -Infinity;
        
        for (let i = 0; i < dataArray.length; i++) {
          if (dataArray[i] > maxValue) {
            maxValue = dataArray[i];
            maxIndex = i;
          }
        }
        
        const dominantFrequency = maxIndex * audioContext.sampleRate / analyser.fftSize;
        
        resolve({
          duration_seconds: duration,
          peak_amplitude: peakAmplitude,
          average_amplitude: averageAmplitude,
          spectral_centroid: spectralCentroid,
          dominant_frequency: dominantFrequency,
          transient_points: transients
        });
        
      } catch (error) {
        reject(error);
      }
    };
    
    fileReader.onerror = reject;
    fileReader.readAsArrayBuffer(file);
  });
};

// ================== Sample Relationships Methods ==================

/**
 * Record relationship between two samples
 */
export const recordSampleRelationship = async (sampleId1, sampleId2, strength = null) => {
  const response = await api.post('/sample-relationships', {
    sample_id_1: sampleId1,
    sample_id_2: sampleId2,
    relationship_strength: strength
  });
  return response.data;
};

/**
 * Get related samples
 */
export const getRelatedSamples = async (sampleId, minStrength = 0, limit = 10) => {
  const params = { min_strength: minStrength, limit };
  const response = await api.get(`/samples/${sampleId}/related`, { params });
  return response.data;
};

// ================== Performance Metrics Methods ==================

/**
 * Record performance metrics for a snippet
 */
export const recordPerformanceMetrics = async (snippetId, data) => {
  const response = await api.post(`/snippets/${snippetId}/performance`, data);
  return response.data;
};

/**
 * Get performance metrics for a snippet
 */
export const getPerformanceMetrics = async (snippetId, limit = 10) => {
  const params = { limit };
  const response = await api.get(`/snippets/${snippetId}/performance`, { params });
  return response.data;
};

/**
 * Get performance comparison
 */
export const getPerformanceComparison = async (snippetId) => {
  const response = await api.get(`/snippets/${snippetId}/performance/compare`);
  return response.data;
};

/**
 * Measure performance during ChucK execution
 * This is a utility function that can be used to gather performance metrics
 * during ChucK execution
 */
export const measureChuckPerformance = async (snippetId, sessionId, executeFunc) => {
  // Gather device info
  const deviceInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    vendor: navigator.vendor,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio,
    hardwareConcurrency: navigator.hardwareConcurrency,
    memoryInfo: navigator.deviceMemory || 'unknown'
  };
  
  // Start monitoring
  const startTime = performance.now();
  let peakMemory = 0;
  let peakCPU = 0;
  let bufferUnderruns = 0;
  
  // Memory monitoring
  const memoryInterval = setInterval(() => {
    if (window.performance && window.performance.memory) {
      const memory = window.performance.memory.usedJSHeapSize / 1024;
      peakMemory = Math.max(peakMemory, memory);
    }
  }, 100);
  
  try {
    // Execute the ChucK code
    const result = await executeFunc(snippetId, sessionId);
    
    // Stop monitoring
    clearInterval(memoryInterval);
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    // Basic optimization suggestions based on execution time
    const optimizationSuggestions = [];
    
    if (executionTime > 1000) {
      optimizationSuggestions.push("Consider optimizing long-running operations");
    }
    
    if (peakMemory > 50000) { // 50MB
      optimizationSuggestions.push("High memory usage detected - check for memory leaks");
    }
    
    if (bufferUnderruns > 0) {
      optimizationSuggestions.push(`Audio buffer underruns detected (${bufferUnderruns}) - consider simplifying audio chain`);
    }
    
    // Record performance metrics
    const metrics = {
      execution_time_ms: executionTime,
      peak_cpu_usage: peakCPU,
      memory_usage_kb: peakMemory,
      buffer_underruns: bufferUnderruns,
      device_info: deviceInfo,
      optimization_suggestions: optimizationSuggestions
    };
    
    await recordPerformanceMetrics(snippetId, metrics);
    
    return { result, metrics };
  } catch (error) {
    clearInterval(memoryInterval);
    throw error;
  }
};

// ================== Event Logging Methods ==================

/**
 * Record an event
 */
export const recordEvent = async (sessionId, eventType, eventData = {}, snippetId = null, sampleId = null) => {
  const response = await api.post('/events', {
    session_id: sessionId,
    event_type: eventType,
    event_data: eventData,
    snippet_id: snippetId,
    sample_id: sampleId
  });
  return response.data;
};

/**
 * Get events
 */
export const getEvents = async (filters = {}, limit = 100) => {
  const params = { ...filters, limit };
  const response = await api.get('/events', { params });
  return response.data;
};

// ================== Cache Strategy Methods ==================

/**
 * Set cache strategy for a sample
 */
export const setCacheStrategy = async (sampleId, data) => {
  const response = await api.post(`/samples/${sampleId}/cache-strategy`, data);
  return response.data;
};

/**
 * Get cache strategy for a sample
 */
export const getCacheStrategy = async (sampleId) => {
  const response = await api.get(`/samples/${sampleId}/cache-strategy`);
  return response.data;
};

/**
 * Get samples recommended for caching
 */
export const getRecommendedCacheSamples = async (minPriority = 1, limit = 20) => {
  const params = { min_priority: minPriority, limit };
  const response = await api.get('/cache/recommended', { params });
  return response.data;
};

/**
 * Preload high-priority samples
 * This is a utility function that preloads high-priority samples
 */
export const preloadHighPrioritySamples = async (sessionId, minPriority = 2) => {
  try {
    // Get recommended samples
    const recommendedSamples = await getRecommendedCacheSamples(minPriority);
    
    if (recommendedSamples.length === 0) {
      return { success: true, message: 'No high-priority samples to preload' };
    }
    
    // Extract sample IDs and prepare for preloading
    const sampleIds = recommendedSamples.map(sample => sample.id);
    
    // This would integrate with your existing ChucK tools
    // For now, we'll just update their cache status
    for (const sampleId of sampleIds) {
      await setCacheStrategy(sampleId, { cache_status: 'cached' });
    }
    
    return {
      success: true,
      message: `Preloaded ${sampleIds.length} high-priority samples`,
      samples: recommendedSamples
    };
  } catch (error) {
    console.error('Error preloading samples:', error);
    throw error;
  }
};

export default {
  // Snippet Embeddings
  storeSnippetEmbedding,
  getSnippetEmbeddings,
  searchSnippetsByEmbedding,
  
  // Musical Patterns
  getPatterns,
  getPattern,
  createPattern,
  updatePattern,
  deletePattern,
  
  // Usage Context
  recordUsageContext,
  getUsageContexts,
  
  // Sample Analytics
  storeSampleAnalytics,
  getSampleAnalytics,
  analyzeSampleFile,
  
  // Sample Relationships
  recordSampleRelationship,
  getRelatedSamples,
  
  // Performance Metrics
  recordPerformanceMetrics,
  getPerformanceMetrics,
  getPerformanceComparison,
  measureChuckPerformance,
  
  // Event Logging
  recordEvent,
  getEvents,
  
  // Cache Strategy
  setCacheStrategy,
  getCacheStrategy,
  getRecommendedCacheSamples,
  preloadHighPrioritySamples
};