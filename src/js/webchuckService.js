// js/webchuckService.js
import { Chuck } from '/webchuck/wc-bundle.js'; // Adjust path if needed
import * as UI from './ui.js';
import {WEBCHUCK_DIR, DEFAULT_AUDIO_FILES, MAX_PRELOAD_FILES, getClientConfig} from './config.js';
import * as AudioRecorder from "./audioRecorder.js";
import AudioVisualizer from "./audioVisualizer.js";

let theChuck = null; // The single WebChucK instance
let capturedMessages = []; // Store console messages between server sends
let isPreloading = false; // Prevent concurrent preloads
const config = getClientConfig();
this.wsBaseUrl = config.wsBaseUrl;

// --- Console Capturing ---
// Save original console methods (attach to Chuck prototype)
const originalChuckPrint = Chuck.prototype.chuckPrint || console.log; // Fallback if needed
const audioContext = new AudioContext();

// Override chuckPrint
Chuck.prototype.chuckPrint = function (...args) {
    const message = args.join(' ');
    capturedMessages.push({ type: 'log', message });
    originalChuckPrint.apply(this, args); // Call original
    // Optionally update UI console immediately too
    // UI.updateConsole(`[Chuck]: ${message}`);
};

// Function to get and clear captured messages (called by serverConnection)
export function getAndClearCapturedMessages() {
    const messages = [...capturedMessages];
    capturedMessages = [];
    return messages;
}
// Function to send captured messages back to the server
export function getCapturedMessages() {
    return [...capturedMessages]
}

export function clearCapturedMessages() {
    capturedMessages = [];
}

// --- WebChucK Initialization ---
export async function initWebChuck() {
    if (theChuck) {
        UI.updateConsole("WebChucK already initialized.");
        return true; // Already initialized
    }

    UI.setConnectionStatus('Fetching audio files...');
    let audioFilesToLoad = [];

    try {
        const response = await fetch(`${config.apiBaseUrl}/api/audio`);
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        const data = await response.json();
        audioFilesToLoad = (data.files || []).map(file => ({
            // Ensure paths are relative to the static root as expected by server
             serverFilename: './' + file.replaceAll("\\", "/"), // Prepend './' for server path
             virtualFilename: file.replaceAll("\\", "/") // Virtual path for ChucK code
        }));
        UI.updateConsole(`Found ${audioFilesToLoad.length} audio files from server.`);

    } catch (fetchError) {
        console.error('Error fetching audio files:', fetchError);
        UI.updateConsole(`Warning: Could not fetch audio files: ${fetchError.message}. Using defaults.`);
        // Use default files (ensure these are correctly pathed relative to HTML)
         audioFilesToLoad = DEFAULT_AUDIO_FILES.map(f => ({
             ...f,
             // Adjust serverFilename if needed based on where defaults live
             serverFilename: f.serverFilename.startsWith('./') ? f.serverFilename : './' + f.serverFilename
         }));
    }

    UI.updateConsole('Initializing WebChucK...');
    UI.setConnectionStatus('Connecting to WebChucK...');

    try {
        // Limit initial file load to prevent excessive startup time/errors
        const initialFiles = [];
        // const initialFiles = audioFilesToLoad.slice(0, 10);
        // UI.updateConsole(`Initializing with ${initialFiles.length} files:\n` + initialFiles.map(f => f.virtualFilename).join('\n'));

        // Ensure AudioContext is resumed by user interaction before init
        // (Handled by the button click in main.js)

        // Initialize ChucK with a local audioContext, connect ChucK to the context destination
        theChuck = await Chuck.init(initialFiles, audioContext, undefined, WEBCHUCK_DIR);
        theChuck.connect(audioContext.destination);

        if (!theChuck) {
            throw new Error("Chuck.init returned undefined.");
        }

        theChuck.chuckPrint = Chuck.prototype.chuckPrint; // Ensure override is applied
        
        theChuck.setParamInt("ASYNC_LOAD", 1) // Set experimental flag, optional

        // Add latency hint if needed: theChuck.latencyHint = 0.1;

        UI.setConnectionStatus('Connected to WebChucK');
        UI.updateConsole('WebChucK initialized successfully!');
        UI.enableWebChuckControls(true);
        // Ensure Audio Context is running (might be redundant if button click worked)
        await ensureAudioContextRunning();
        return true;

    } catch (error) {
        console.error('Error initializing WebChucK:', error);
        UI.updateConsole(`Error initializing WebChucK: ${error.message}`);
        UI.setConnectionStatus('WebChucK Connection Failed');
        theChuck = null; // Reset instance on failure
        return false;
    }
}

// --- Audio Context Helper ---
async function ensureAudioContextRunning() {
    if (theChuck && audioContext) {
        if (audioContext.state !== 'running') {
            UI.updateConsole("Attempting to resume audio context...");
            try {
                await audioContext.resume();
                UI.updateConsole("Audio context resumed.");
            } catch (err) {
                console.error("Failed to resume audio context:", err);
                UI.updateConsole(`Error resuming audio context: ${err.message}. Audio might not play.`);
            }
        }
    } else {
        UI.updateConsole("Audio context not available yet.");
    }
}

// --- Core ChucK Operations ---

export async function runCode(code) {
    if (!theChuck) {
        UI.updateConsole('WebChucK not initialized.');
        return false;
    }
    await ensureAudioContextRunning(); // Ensure context is ready
    try {
        UI.updateConsole('Running code...');
        // Clear previous messages before execution
        clearCapturedMessages();
        // Clear previous shreds/VM state
        // await theChuck.clearChuckInstance(); // Use async version if available

        // Run new code
        const shredId = await theChuck.runCode(code); // Use async version

        // const success = await WebChuckService.runCode(code);

        // if (success) {
        //     await preprocessCodeForSamples(code);
        //
        //     AudioRecorder.startAudioRecording(); // Start recording when code runs successfully
        //
        //     await preprocessCodeForParameters(code);
        //
        //     // Start visualizer
        //     AudioVisualizer.startVisualization();
        // }

        UI.updateConsole(`Code execution started (Shred ID: ${shredId}).`);
        console.log("Code execution initiated via UI");
        return true;
    } catch (error) {
        console.error('Error running ChucK code:\n', error);
        UI.updateConsole('Error running ChucK code:\n', true, 'error-heading');
        UI.updateConsole(`${error}\n${getCapturedMessages().map(m => m.message.replace("[Chuck]: ", "")).join("\n")}`, true, 'error');
        // Send captured messages immediately on error?
        const capturedMessagesText = capturedMessages.map(message => message.message).join('\n');
        // handle error reporting...
        return false;
    }
}

export async function stopChuck() {
    if (!theChuck) {
        UI.updateConsole('WebChucK not initialized.');
        return false;
    }
    try {
        UI.updateConsole('Stopping ChucK...');
        await theChuck.clearChuckInstance(); // Use async version
        UI.updateConsole('ChucK stopped.');
        return true;
    } catch (error) {
        console.error('Error stopping ChucK:', error);
        UI.updateConsole(`Error stopping ChucK: ${error.message}`);
        return false;
    }
}

// Function to update variables in running ChucK instance
export async function updateVariable(name, value) {
    if (!theChuck) {
        console.error('WebChucK not initialized');
        return false;
    }
    
    try {
        // Determine variable type and use appropriate method
        if (Number.isInteger(value)) {
            await theChuck.setInt(name, Math.round(value));
        } else {
            await theChuck.setFloat(name, value);
        }
        return true;
    } catch (error) {
        console.error(`Error updating variable ${name}:`, error);
        return false;
    }
}

// --- File Preloading ---

async function PreloadFiles(formattedFiles) {
    await formattedFiles.map(async file => {
        UI.updateConsole(`Preloading: ${file.virtualFilename} (from ${file.serverFilename})`);
        return fetch(file.serverFilename)
            .then((response) => {
                return response.arrayBuffer();
            })
            .then((data) => {
                theChuck.createFile("", file.virtualFilename, new Uint8Array(data));
            })
            .catch((err) => {
                throw new Error(err);
            });
    });
}

// Preload specific files on demand
export async function preloadChuckFiles(fileList) {
     if (isPreloading) {
        UI.updateConsole("Preloading already in progress. Please wait.");
        return false;
    }
     if (!theChuck) {
        UI.updateConsole('Please connect to WebChucK first.');
        return { success: false, message: "WebChucK not connected." };
    }
     if (!fileList || fileList.length === 0) {
         UI.updateConsole("No files specified for preloading.");
         return { success: true, message: "No files to preload." }; // Considered success?
     }

    isPreloading = true;
    UI.updateConsole(`Preloading ${fileList.length} files...`);
    UI.setPreloadStatus(`Preloading ${fileList.length} files...`);

    try {
        // Format files for WebChucK
        const formattedFiles = fileList.slice(0, MAX_PRELOAD_FILES).map(file => ({
            serverFilename: './' + file.replaceAll("\\", "/"), // Ensure relative path for server
            virtualFilename: file.replaceAll('\\', "/") // Virtual path for ChucK
        }));

        if (fileList.length > MAX_PRELOAD_FILES) {
             UI.updateConsole(`Warning: Limiting preload to ${MAX_PRELOAD_FILES} files.`);
        }

         UI.updateConsole(`Formatted files for preload:\n${formattedFiles.map(f => `${f.virtualFilename} (from ${f.serverFilename})`).join('\n')}`);


        // Use theChuck.preloadFiles
        // Note: Older WebChucK versions might not have this method.
        // The original code had a fallback to re-init, which is generally disruptive.
        // We assume a version with preloadFiles here. Add fallback if necessary.
        if (typeof theChuck.createFile !== 'function') {
             throw new Error("theChuck.createFile method is not available in this WebChucK version. Cannot load dynamically.");
        }

        await PreloadFiles(formattedFiles);
        // await theChuck.preloadFiles(formattedFiles);
        const message = `Successfully preloaded ${formattedFiles.length} files!`;
        UI.updateConsole(message);
        UI.setPreloadStatus(message);
        isPreloading = false;
        // Return detailed info matching server expectation if possible
        // This might require more introspection into WebChucK state if available
        return {
            success: true,
            message: message,
            // Ideally, return the list of files confirmed loaded by WebChucK
             preloaded_samples: formattedFiles.map(f => ({ serverFilename: f.serverFilename, virtualFilename: f.virtualFilename }))
         };

    } catch (error) {
        console.error('Error preloading files:', error);
        const message = `Error preloading files: ${error.message}`;
        UI.updateConsole(message);
        UI.setPreloadStatus(message);
        isPreloading = false;
        return { success: false, message: message, error: error.message };
    }
}

// Preload based on sample names by fetching file list from server
export async function preloadSamplesByName(sampleNames) {
     if (!theChuck) {
        UI.updateConsole('Please connect to WebChucK first.');
        return { success: false, message: "WebChucK not connected." };
    }
     if (!sampleNames || sampleNames.length === 0) {
         UI.updateConsole("No sample names provided for preloading.");
         return { success: true, message: "No samples specified." };
     }

    UI.updateConsole(`Working file list for samples: ${sampleNames.join(', ')}`);
    UI.setPreloadStatus(`Working files for ${sampleNames.length} samples...`);

    try {
        // Get all available audio files from the server
        const response = await fetch(`${config.apiBaseUrl}/api/audio`);
         if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        const data = await response.json();
        const allFiles = data.files || []; // Expecting relative paths from static root

        // Filter files based on the sample list
        const filesToPreload = allFiles.filter(fileRelativePath => {
            // Check if the file path starts with any of the requested sample names/prefixes
            return sampleNames.some(sample =>
                 fileRelativePath.startsWith(sample + '/') || // e.g., accordion/C4.wav
                 fileRelativePath.includes('/' + sample + '/') // e.g., some_dir/accordion/C4.wav
            );
        });

        if (filesToPreload.length === 0) {
            const warningMsg = `No matching files found on server for samples: ${sampleNames.join(', ')}`;
             UI.updateConsole(warningMsg);
             UI.setPreloadStatus(warningMsg);
             return { success: false, message: warningMsg }; // Fail if no files found
        }

         UI.updateConsole(`Found ${filesToPreload.length} files to preload.`);

        // Call the actual file preloader
        return await preloadChuckFiles(filesToPreload);

    } catch (error) {
        console.error('Error preloading samples by name:', error);
         const message = `Error preloading samples: ${error.message}`;
         UI.updateConsole(message);
         UI.setPreloadStatus(message);
         return { success: false, message: message, error: error.message };
    }
}

export function getAudioContext() {
    return audioContext;
}

// --- Getter for theChuck instance (if needed externally) ---
export function getChuckInstance() {
    return theChuck;
}
