// src/contexts/WebChuckContext.tsx
import React, {createContext, useContext, useState, useEffect, useCallback} from 'react';
import {toast} from 'react-hot-toast';
import WebChucKService from '../services/WebchuckService.js';

interface WebChuckContextType {
  isLoaded: boolean;
  isConnected: boolean;
  isRunning: boolean;
  isCompiling: boolean;
  consoleOutput: Array<{ id: number, text: any, type: string }>;
  shredIds: number[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  consoleMessages: any[];
  stopCode: () => void;
  runCode: (code: string) => Promise<number | null>;
  replaceShred: (shredId: any, code: any) => Promise<number | null>;
  removeShred: (shredId: any) => Promise<void>;
  clearConsole: () => void;
}

const WebChuckContext = createContext<WebChuckContextType | null>(null);

export const WebChuckContextProvider = ({children}: { children: React.ReactNode }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [isCompiling, setIsCompiling] = useState(false);
    const [consoleOutput, setConsoleOutput] = useState<Array<{ id: number, text: any, type: string }>>([]);
    const [shredIds, setShredIds] = useState<number[]>([]);
 //   const [sessionId, setSessionId] = useState(null);
    const [consoleMessages, setConsoleMessages] = useState([]);

    // Initialize WebChuck
    useEffect(() => {
        const initialize = async () => {
            try {
                await WebChucKService.init();
                setIsLoaded(true);

                // Set up console output listener
                WebChucKService.addEventListener('console', (message: any) => {
                    setConsoleOutput(prev => [...prev, {
                        id: Date.now(),
                        text: message,
                        type: message.startsWith('ERROR:') ? 'error' : 'info'
                    }]);
                });

                // Set up shred update listener
                WebChucKService.addEventListener('shred', (data: any) => {
                    if (data.type === 'add') {
                        setShredIds(prev => [...prev, data.id]);
                    } else if (data.type === 'remove') {
                        setShredIds(prev => prev.filter(id => id !== data.id));
                    }
                });

            } catch (error) {
                console.error('Failed to initialize WebChuck:', error);
                toast.error('WebChuck initialization failed');
            }
        };

        initialize();

        return () => {
            // Clean up when component unmounts
            WebChucKService.cleanup();
        };
    }, []);

    // Start and connect to audio
    const connect = useCallback(async () => {
        if (!isLoaded) {
            toast.error('WebChuck is not loaded yet');
            return;
        }

        try {
            await WebChucKService.connect();
            setIsConnected(true);
            setIsRunning(true);
            toast.success('Connected to audio!');
        } catch (error) {
            console.error('Failed to connect to audio:', error);
            toast.error(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, [isLoaded]);

    // Disconnect from audio
    const disconnect = useCallback(async () => {
        if (!isConnected) return;

        try {
            await WebChucKService.disconnect();
            setIsConnected(false);
            setIsRunning(false);
            toast.success('Disconnected from audio');
        } catch (error) {
            console.error('Failed to disconnect:', error);
            toast.error(`Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, [isConnected]);

    // Run ChucK code
    const runCode = useCallback(async (code: string) => {
        if (!isConnected) {
            toast.error('Please connect to audio first');
            return null;
        }

        try {
            setIsCompiling(true);
            const shredId = await WebChucKService.runCode(code);

            if (shredId) {
                toast.success(`Code running (Shred ${shredId})`);
                return typeof shredId === 'boolean' ? 1 : shredId; // Convert boolean to number if needed
            } else {
                toast.error('Failed to run code');
                return null;
            }
        } catch (error) {
            console.error('Error running code:', error);
            toast.error(`Compilation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        } finally {
            setIsCompiling(false);
        }
    }, [isConnected]);

    // Replace a running shred with new code
    const replaceShred = useCallback(async (shredId: any, code: any) => {
        if (!isConnected) {
            toast.error('Please connect to audio first');
            return null;
        }

        try {
            setIsCompiling(true);
            const newShredId = await WebChucKService.replaceShred(shredId, code);

            if (newShredId) {
                toast.success(`Replaced Shred ${shredId} with ${newShredId}`);
                return newShredId;
            } else {
                toast.error('Failed to replace shred');
                return null;
            }
        } catch (error) {
            console.error('Error replacing shred:', error);
            toast.error(`Compilation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        } finally {
            setIsCompiling(false);
        }
    }, [isConnected]);

    // Remove a running shred
    const removeShred = useCallback(async (shredId: any) => {
        if (!isConnected) return;

        try {
            await WebChucKService.removeShred(shredId);
            toast.success(`Removed Shred ${shredId}`);
        } catch (error) {
            console.error('Error removing shred:', error);
            toast.error(`Failed to remove shred: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, [isConnected]);


    const stopCode = useCallback(async () => {
        await WebChucKService.stopCode();
    }, []);

    // const setSessionName = useCallback((name:string) => {
    //     WebChucKService.setSessionName(name);
    // }, []);

    // Clear console output
    const clearConsole = useCallback(() => {
        setConsoleOutput([]);
    }, []);

    const value = {
        isLoaded,
        isConnected,
        isRunning,
        isCompiling,
        consoleOutput,
        shredIds,
        connect,
        disconnect,
        // sessionId,
        consoleMessages,
        // setSessionName,
        stopCode,
        runCode,
        replaceShred,
        removeShred,
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

export default WebChuckContext;
