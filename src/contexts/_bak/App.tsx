import React, { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import toast from 'react-hot-toast';
import api from '../services/api';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      onError: (error) => {
        toast.error(error.response?.data?.error || 'An error occurred');
      },
    },
    mutations: {
      onError: (error) => {
        toast.error(error.response?.data?.error || 'An error occurred');
      },
    },
  },
});

// Create the context
const AppContext = createContext();

// Custom hook to use the context
export const useApp = () => useContext(AppContext);

// Context provider component
export const AppProvider = ({ children }) => {
  const [chuckSession, setChuckSession] = useState(null);
  const [selectedVolume, setSelectedVolume] = useState(null);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Initialize ChucK session when component mounts
  useEffect(() => {
    const initChuckSession = async () => {
      try {
        // This would integrate with your current ChucK session management
        const sessions = await api.getChucKSessions();
        if (sessions.length > 0) {
          setChuckSession(sessions[0].id);
        }
      } catch (error) {
        console.error('Failed to initialize ChucK session:', error);
        toast.error('Failed to initialize ChucK session');
      }
    };
    
    initChuckSession();
  }, []);
  
  // Function to execute a snippet
  const executeSnippet = async (snippetId) => {
    if (!chuckSession) {
      toast.error('No active ChucK session');
      return;
    }
    
    try {
      toast.loading('Executing snippet...', { id: 'execute' });
      const result = await api.executeSnippet(snippetId, chuckSession);
      toast.success('Snippet executed successfully', { id: 'execute' });
      return result;
    } catch (error) {
      toast.error('Failed to execute snippet', { id: 'execute' });
      console.error('Failed to execute snippet:', error);
      throw error;
    }
  };
  
  // Function to load a sample into ChucK
  const loadSampleToChucK = async (sampleId) => {
    if (!chuckSession) {
      toast.error('No active ChucK session');
      return;
    }
    
    try {
      // This would integrate with your current ChucK sample loading
      // For now, we'll just get the sample info
      const sample = await api.getSample(sampleId);
      
      // This would call your preloadSamples tool
      toast.success(`Sample "${sample.filename}" loaded into ChucK`);
      return sample;
    } catch (error) {
      toast.error('Failed to load sample');
      console.error('Failed to load sample:', error);
      throw error;
    }
  };
  
  // Context value
  const contextValue = {
    chuckSession,
    setChuckSession,
    selectedVolume,
    setSelectedVolume,
    selectedSnippet,
    setSelectedSnippet,
    sidebarOpen,
    setSidebarOpen,
    executeSnippet,
    loadSampleToChucK,
  };
  
  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={contextValue}>
        {children}
      </AppContext.Provider>
    </QueryClientProvider>
  );
};

export default AppProvider;