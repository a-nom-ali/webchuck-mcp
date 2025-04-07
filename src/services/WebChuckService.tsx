import {Chuck} from 'webchuck';
import {toast} from "react-hot-toast"; // Adjust path if needed

class WebChuckService {
    chuck: any;
    isConnected: boolean = false;
    isPreloading: boolean = false;
    listeners: Map<any, any> = new Map();
    // audioContext: AudioContext | null;
    isInitialized: boolean;
    eventListeners: {
        console: Array<(message: string) => void>;
        shred: Array<(data: any) => void>;
        audioData: Array<(data: any) => void>;
    };
    analyzerNode: AnalyserNode | null;
    analyzerInterval: number | null;

    constructor() {
        this.chuck = null;
        this.isConnected = false;
        this.listeners = new Map();
        // this.audioContext = null; // because it messes with the worker
        this.isInitialized = false;
        this.eventListeners = {
            console: [],
            shred: [],
            audioData: []
        };
        this.analyzerNode = null;
        this.analyzerInterval = null;
    }

    async init() {
        if (this.isInitialized) return;

        try {
            // Dynamically import WebChuck (assumes it's available in the global scope or via CDN)
            if (typeof Chuck === 'undefined') {
                throw new Error('WebChuck library not found');
            }

            // Initialize WebChuck
            this.chuck = await Chuck.init([], undefined, undefined, "/webchuck/");
            // this.chuck.setOption('audioInput', true);
            // this.chuck.setOption('microphoneAccess', true);

            // Set up console handler
            // this.chuck.setLogCallback((message:any) => {
            //   this._notifyListeners('console', message);
            // });

            // Set up shred handler for adds
            // this.chuck.setShredAddCallback((shredId:any) => {
            //   this._notifyListeners('shred', {
            //     type: 'add',
            //     id: shredId
            //   });
            // });

            // Set up shred handler for removes
            // this.chuck.setShredRemoveCallback((shredId:any) => {
            //   this._notifyListeners('shred', {
            //     type: 'remove',
            //     id: shredId
            //   });
            // });

            this.isInitialized = true;
        } catch (error) {
            toast.error(`Failed to initialize WebChuck: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                toast.loading('Connecting to WebChuck server...', {id: 'connect-toast'});
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                toast.error(`Connection error: ${errorMessage}`, {id: 'connect-toast'});
                reject(err);
            }
        });
    }

    async disconnect() {
        await this.stopCode();
        this.isConnected = false;
    }

// --- Audio Context Helper ---
    async ensureAudioContextRunning() {
        if (this.chuck) {
            if (!this.chuck.isReady) {
                toast.loading("Attempting to resume audio context...");
                try {
                    await this.init()
                    toast.success("Audio context resumed.");
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                    toast.error(`Error resuming audio context: ${errorMessage}. Audio might not play.`);
                }
            }
        } else {
            toast.error("Audio context not available yet.");
        }
    }

    async runCode(code: string) {
        if (!this.chuck || !this.chuck.isReady || !this.isConnected) {
            toast.error('WebChucK not initialized.');
            return false;
        }

        await this.ensureAudioContextRunning();

        try {
            const shredId = await this.chuck.runCode(code); // Use async version
            toast.success(`Code execution started (Shred ID: ${shredId}).`);
            return true;
        } catch (error) {
            toast.error(`Error running ChucK code:\n${error}`);
            return false;
        }
    }

    async stopCode() {
        if (!this.chuck || !this.chuck.isReady || !this.isConnected) {
            toast.error('WebChucK not initialized.');
            return false;
        }

        await this.chuck.clearChuckInstance(); // Use async version

        toast.success('Code execution stopped');
    }

    async loadSamples(filePaths: any[] = []) {
         if (this.isPreloading) {
            toast.error("Preloading already in progress. Please wait.");
            return false;
        }
         if (!this.chuck) {
            toast.error('Please connect to WebChucK first.');
            return { success: false, message: "WebChucK not connected." };
        }
         if (!filePaths || filePaths.length === 0) {
             toast.error("No files specified for preloading.");
             return { success: true, message: "No files to preload." }; // Considered success?
         }
        if (!this.chuck.isReady || !this.isConnected) {
            toast.error('WebChucK not initialized.');
            return;
        }

        this.isPreloading = true;
        if (typeof this.chuck.createFile !== 'function') {
             throw new Error("theChuck.createFile method is not available in this WebChucK version. Cannot load dynamically.");
        }

        await filePaths.map(async file => {
            // UI.updateConsole(`Preloading: ${file.virtualFilename} (from ${file.serverFilename})`);
            return fetch(file.serverFilename)
                .then((response) => {
                    return response.arrayBuffer();
                })
                .then((data) => {
                    this.chuck.createFile("", file.virtualFilename, new Uint8Array(data));
                })
                .catch((err) => {
                    throw new Error(err);
                });
        });

        const message = `Successfully preloaded ${filePaths.length} files!`;

        this.isPreloading = false;

        return {
            success: true,
            message: message,
            // Ideally, return the list of files confirmed loaded by WebChucK
             preloaded_samples: filePaths.map(f => ({ serverFilename: f.serverFilename, virtualFilename: f.virtualFilename }))
         };
    }

    // preloadSampleFamily(family: any) {
    //     if (!this.isConnected) {
    //         toast.error('Not connected to server');
    //         return;
    //     }
    //
    //     this._sendMessage({
    //         type: 'preloadSampleFamily',
    //         payload: {family}
    //     });
    //     toast.loading(`Loading ${family} samples...`, {id: 'preload-toast'});
    // }

    async replaceShred(shredId: any, code: string) {
        if (!this.isInitialized) {
            throw new Error('WebChuck not initialized');
        }

        try {
            await this.chuck.removeShred(shredId);
            const newShredId = await this.chuck.runCode(code);
            return newShredId;
        } catch (error) {
            console.error('Error replacing shred:', error);
            throw error;
        }
    }

    async removeShred(shredId: any) {
        if (!this.isInitialized) return;

        try {
            await this.chuck.removeShred(shredId);
        } catch (error) {
            console.error('Error removing shred:', error);
            throw error;
        }
    }

    addEventListener(eventType: string, callback: (data: any) => void) {
        if (!this.eventListeners[eventType as keyof typeof this.eventListeners]) {
            (this.eventListeners as Record<string, ((data: any) => void)[]>)[eventType] = [];
        }

        (this.eventListeners as Record<string, ((data: any) => void)[]>)[eventType].push(callback);

        // Return a function to remove this listener
        return () => {
            (this.eventListeners as Record<string, ((data: any) => void)[]>)[eventType] =
                (this.eventListeners as Record<string, ((data: any) => void)[]>)[eventType].filter(cb => cb !== callback);
        };
    }

    removeEventListener(event: any, callback: any) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    _notifyListeners(eventType: string, data: any) {
        if (!(this.eventListeners as Record<string, ((data: any) => void)[]>)[eventType]) return;

        (this.eventListeners as Record<string, ((data: any) => void)[]>)[eventType].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${eventType} event listener:`, error);
            }
        });
    }

    handleIncomingMessage(event: any) {
        try {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case 'sessionId':
                    this._notifyListeners('sessionChange', message.payload.sessionId);
                    break;

                case 'consoleOutput':
                    this._notifyListeners('console', {
                        text: message.payload.message,
                        type: message.payload.type || 'log'
                    });
                    break;

                case 'sampleLoaded':
                    toast.success(`Sample loaded: ${message.payload.filename}`);
                    this._notifyListeners('sampleLoaded', message.payload);
                    break;

                case 'preloadComplete':
                    toast.success(`${message.payload.family} samples loaded`, {id: 'preload-toast'});
                    this._notifyListeners('preloadComplete', message.payload);
                    break;

                case 'audioData':
                    this._notifyListeners('audioData', message.payload);
                    break;

                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (err) {
            console.error('Failed to process message:', err);
        }
    }

    _setupAudioAnalyzer() {
        if (!this.chuck || !this.chuck.isReady) return;

        // Clean up existing analyzer if any
        this._cleanupAudioAnalyzer();

        // Create analyzer node
        this.analyzerNode = this.chuck.createAnalyser();//might still need to create an audio context - figure it out
        this.analyzerNode.fftSize = 2048;
        this.analyzerNode.smoothingTimeConstant = 0.8;

        // Connect chuck output to analyzer
        this.chuck.connect(this.analyzerNode);

        // Set up periodic analysis
        const bufferLength = this.analyzerNode.frequencyBinCount;
        const waveformData = new Float32Array(bufferLength);
        const frequencyData = new Uint8Array(bufferLength);

        this.analyzerInterval = setInterval(() => {
            // Check if analyzer node is still available
            if (!this.analyzerNode) return;

            // Get waveform data
            this.analyzerNode.getFloatTimeDomainData(waveformData);

            // Get frequency data
            this.analyzerNode.getByteFrequencyData(frequencyData);

            // Calculate RMS (volume level)
            let rmsSum = 0;
            let peakValue = 0;
            for (let i = 0; i < waveformData.length; i++) {
                const value = waveformData[i];
                rmsSum += value * value;
                peakValue = Math.max(peakValue, Math.abs(value));
            }
            const rms = Math.sqrt(rmsSum / waveformData.length);

            // Normalize frequency data to 0-1 range
            const normalizedFrequencyData = Array.from(frequencyData)
                .map(value => value / 255);

            // Get a resampled version of the waveform for visualization
            const resampledWaveform = this._resampleData(waveformData, 100);

            // Notify listeners with the audio data
            this._notifyListeners('audioData', {
                waveform: resampledWaveform,
                spectrum: normalizedFrequencyData,
                rms,
                peak: peakValue
            });
        }, 50) as unknown as number; // Update ~20 times per second
    }

    _cleanupAudioAnalyzer() {
        if (this.analyzerInterval) {
            clearInterval(this.analyzerInterval);
            this.analyzerInterval = null;
        }

        if (this.analyzerNode && this.chuck && this.chuck.audioNode) {
            try {
                this.chuck.audioNode.disconnect(this.analyzerNode);
            } catch (error) {
                // Ignore disconnection errors
            }
            this.analyzerNode = null;
        }
    }

    _resampleData(data: any, targetLength: any) {
        const result = new Array(targetLength);
        const step = data.length / targetLength;

        for (let i = 0; i < targetLength; i++) {
            const index = Math.floor(i * step);
            result[i] = data[index];
        }

        return result;
    }

    cleanup() {
        this._cleanupAudioAnalyzer();

        // Clear all event listeners
        Object.keys(this.eventListeners).forEach(key => {
            (this.eventListeners as Record<string, any[]>)[key] = [];
        });

        // Stop all shreds
        if (this.chuck) {
            try {
                this.chuck.removeAllShreds();
            } catch (error) {
                // Ignore errors during cleanup
            }
        }

        // Close audio context
        // if (audioContext && audioContext.state !== 'closed') {
        //     try {
        //         audioContext.close();
        //     } catch (error) {
        //         // Ignore errors during cleanup
        //     }
        // }

        this.chuck = null;
        // audioContext = null;
        this.isInitialized = false;
    }
}

// Create singleton instance
const WebChucKService = new WebChuckService();

export default WebChucKService;