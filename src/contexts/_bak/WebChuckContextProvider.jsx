// src/contexts/WebChuckContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import webchuckService from '../services/webchuckService';
import { toast } from 'react-hot-toast';

const WebChuckContext = createContext(null);

export const WebChuckProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [consoleMessages, setConsoleMessages] = useState([]);
  
  useEffect(() => {
    // Set up event listeners
    const connectionListener = (connected) => {
      setIsConnected(connected);
      if (connected) {
        toast.success('Connected to WebChuck server');
      } else {
        toast.error('Disconnected from WebChuck server');
        setSessionId(null);
      }
    };
    
    const sessionListener = (id) => {
      setSessionId(id);
      toast.success(`Session ID: ${id}`);
    };
    
    const consoleListener = (message) => {
      setConsoleMessages(prev => [...prev, message]);
    };
    
    // Register listeners
    const removeConnectionListener = webchuckService.addEventListener('connectionChange', connectionListener);
    const removeSessionListener = webchuckService.addEventListener('sessionChange', sessionListener);
    const removeConsoleListener = webchuckService.addEventListener('console', consoleListener);
    
    // Cleanup on unmount
    return () => {
      removeConnectionListener();
      removeSessionListener();
      removeConsoleListener();
    };
  }, []);
  
  const connect = useCallback(async () => {
    try {
      await webchuckService.connect();
      return true;
    } catch (error) {
      toast.error('Failed to connect to server');
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
  
  const clearConsole = useCallback(() => {
    setConsoleMessages([]);
  }, []);
  
  // Additional methods like loadSamples, searchSamples, etc.
  
  const value = {
    isConnected,
    sessionId,
    consoleMessages,
    connect,
    disconnect,
    runCode,
    stopCode,
    setSessionName,
    clearConsole,
    // Add other methods here
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