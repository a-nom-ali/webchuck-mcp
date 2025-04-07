// src/contexts/WebChuckContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import webchuckService from '../services/webchuckService';

const WebChuckContext = createContext(null);

export const WebChuckProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [consoleMessages, setConsoleMessages] = useState([]);
  const [samples, setSamples] = useState([]);
  const [preloadStatus, setPreloadStatus] = useState('');
  
  useEffect(() => {
    // Set up event listeners
    const connectionListener = (connected) => {
      setIsConnected(connected);
    };
    
    const sessionListener = (id) => {
      setSessionId(id);
    };
    
    const consoleListener = (message) => {
      setConsoleMessages(prev => [...prev, message]);
    };
    
    const sampleLoadedListener = (sampleInfo) => {
      setSamples(prev => [...prev, sampleInfo]);
    };
    
    const preloadCompleteListener = (info) => {
      setPreloadStatus(`${info.family} samples loaded`);
    };
    
    // Register listeners
    const removeConnectionListener = webchuckService.addEventListener('connectionChange', connectionListener);
    const removeSessionListener = webchuckService.addEventListener('sessionChange', sessionListener);
    const removeConsoleListener = webchuckService.addEventListener('console', consoleListener);
    const removeSampleListener = webchuckService.addEventListener('sampleLoaded', sampleLoadedListener);
    const removePreloadListener = webchuckService.addEventListener('preloadComplete', preloadCompleteListener);
    
    // Cleanup on unmount
    return () => {
      removeConnectionListener();
      removeSessionListener();
      removeConsoleListener();
      removeSampleListener();
      removePreloadListener();
    };
  }, []);
  
  const connect = useCallback(async () => {
    try {
      return await webchuckService.connect();
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    }
  }, []);
  
  const disconnect = useCallback(() => {
    webchuckService.disconnect();
  }, []);
  
  const runCode = useCallback((code) => {
    webchuckService.runCode(code);
  }, []);
  
  const stopCode = useCallback(() => {
    webchuckService.stopCode();
  }, []);
  
  const setSessionName = useCallback((name) => {
    webchuckService.setSessionName(name);
  }, []);
  
  const loadSamples = useCallback((filePaths) => {
    webchuckService.loadSamples(filePaths);
  }, []);
  
  const preloadSampleFamily = useCallback((family) => {
    setPreloadStatus(`Loading ${family} samples...`);
    webchuckService.preloadSampleFamily(family);
  }, []);
  
  const clearConsole = useCallback(() => {
    setConsoleMessages([]);
  }, []);
  
  const value = {
    isConnected,
    sessionId,
    consoleMessages,
    samples,
    preloadStatus,
    connect,
    disconnect,
    runCode,
    stopCode,
    setSessionName,
    loadSamples,
    preloadSampleFamily,
    clearConsole,
  };
  
  return (
    <WebChuckContext.Provider value={value}>
      {children}
    </WebChuckContext.Provider>
  );
};

export const useWebChuck = () => {
  const context = useContext(WebChuckContext);
  if (!context) {
    throw new Error('useWebChuck must be used within a WebChuckProvider');
  }
  return context;
};