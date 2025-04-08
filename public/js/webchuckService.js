import { Chuck } from '../webchuck/wc-bundle.js'; // Adjust path if needed
import * as UI from './ui.js';
import {SERVER_URL, WEBCHUCK_DIR, DEFAULT_AUDIO_FILES, MAX_PRELOAD_FILES, POTENTIAL_SAMPLES} from './config.js';
import * as AudioRecorder from "./audioRecorder.js";
import AudioVisualizer from "./audioVisualizer.js";
import ParameterControl from "./parameterControl.js";
import {setConnectionDotStatus} from "./ui.js";

let theChuck = null; // The single WebChucK instance
let capturedMessages = []; // Store console messages between server sends
let isPreloading = false; // Prevent concurrent preloads

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
export async function initWebChuck(initialFiles) {
    // if (!theChuck || !theChuck.isReady) {
    //     UI.updateConsole("WebChucK not initialized.");
    //     return fl; // Already initialized
    // }
    //
    UI.setConnectionStatus('Fetching audio files...');
    let audioFilesToLoad = [];

    try {
        const response = await fetch(`${SERVER_URL}/api/audio`);
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        const data = await response.json();
        audioFilesToLoad = (initialFiles).map(file => ({
            // Ensure paths are relative to the public root as expected by server
             serverFilename: './' + file.serverFilename.replace(/\\\\/g, "/"), // Prepend './' for server path
             virtualFilename: file.virtualFilename.replace(/\\\\/g, "_").replace(/\//g, "_") // Virtual path for ChucK code
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
    UI.setConnectionDotStatus('connecting');

    try {
        // const initialFiles = audioFilesToLoad.slice(0, 10);
        // UI.updateConsole(`Initializing with ${initialFiles.length} files:\n` + initialFiles.map(f => f.virtualFilename).join('\n'));

        // Ensure AudioContext is resumed by user interaction before init
        // (Handled by the button click in main.js)

        // Initialize ChucK with a local audioContext, connect ChucK to the context destination
        preloadedFiles = [];
        theChuck = await Chuck.init(audioFilesToLoad, audioContext, undefined, WEBCHUCK_DIR);
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

async function extractSamplesFromCode(code) {
    // Basic sample detection (optional enhancement)

    // Sample RegEx pattern matching from pattern such as;
    // "audio_files_Waves_FluidR3_GM_bird_tweet_C4.wav" => birdSample1.read;
    const samplePattern = /"([^"]+)"\s*=>\s*[^.]+\.read;/g;

    //Extract all samples from code
    const samplesInCode = [];
    let match;
    while ((match = samplePattern.exec(code)) !== null) {
        samplesInCode.push(match[1]);
    }

    return samplesInCode;
}

async function preprocessCodeForSamples(code) {
    // Basic sample detection (optional enhancement)
    const samplesInCode = await extractSamplesFromCode(code);

    if (samplesInCode.length > 0) {
        UI.updateConsole(`Detected potential samples: ${samplesInCode.join(', ')}. Attempting preload...`);
        // Do wait for preload here, run code immediately after fetching preload
        // Preloading happens async. User should preload explicitly if required *before* run.
        // Or, implement a more complex flow where run waits for preload completion.
        // For simplicity, we just *start* the preload and run the code.
        await preloadSamplesByName(samplesInCode)
            .then(result => {
                if (!result.success) UI.updateConsole(`Auto-preload warning: ${result.message}`);
            });
    }
}


async function getGitHubRawUrl(owner, repo, branch, file) {
    const rawUrl = `https://raw.githubusercontent.com${owner}/${repo}/${branch}/${file.path}`;
    console.log(`Raw URL for ${file.name}:`, rawUrl);
    return rawUrl;
}


async function getGitHubFolderList(owner, repo, branch, file) {
    const response = await fetch(`/api/repo-content/${owner}/:${repo}/${branch}`);
    if (!response.ok) {
    }
}


async function preprocessCodeForParameters(code) {
    // Initialize parameter controls from code
    const hasParams = ParameterControl.initParameterControl(code);
    if (hasParams) {
        UI.updateConsole("Parameter controls initialized.");
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

        if (shredId) {
            await preprocessCodeForSamples(code);
        //
        //     AudioRecorder.startAudioRecording(); // Start recording when code runs successfully
        //
            await preprocessCodeForParameters(code);
        //
        //     // Start visualizer
            AudioVisualizer.startVisualization();
        }

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
        //preloadedFiles = [];
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
let preloadedFiles = [];
export async function PreloadFiles(formattedFiles) {
    // await stopChuck();
    // await initWebChuck(formattedFiles);
    await formattedFiles.map(async file => {
        if(preloadedFiles.some(preloadedFile => {
            return file.virtualFilename.startsWith(preloadedFile.virtualFilename)
        })) {
            UI.updateConsole(`Already preloaded: ${file.virtualFilename} (from ${file.serverFilename})`);
            return;
        }
        preloadedFiles.push(file);

        UI.updateConsole(`Preloading: ${file.virtualFilename} (from ${file.serverFilename})`);
        return await fetch(file.serverFilename.startsWith('./') ? file.serverFilename : ('./' + file.serverFilename))
            .then((response) => {
                UI.updateConsole(`Got binary response for: ${file.virtualFilename} (from ${file.serverFilename})`);
                return response.arrayBuffer();
            })
            .then((data) => {
                UI.updateConsole(`Adding: ${file.virtualFilename} (from ${file.serverFilename})`);
                theChuck.createFile("", file.virtualFilename, new Uint8Array(data));
            })
            .catch((err) => {
                UI.updateConsole(`Failed to get: ${file.virtualFilename} (from ${file.serverFilename})`);
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
        UI.updateConsole('Please start WebChucK first.');
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
            serverFilename: './' + file.replace(/\\\\/g, "/"), // Ensure relative path for server
            virtualFilename: file.replace(/\\\\/g, "_").replace(/\//g, "_") // Virtual path for ChucK
        }));

        if (fileList.length > MAX_PRELOAD_FILES) {
             UI.updateConsole(`Warning: Limiting preload to ${MAX_PRELOAD_FILES} files.`);
        }

         // UI.updateConsole(`Formatted files for preload:\n${formattedFiles.map(f => `${f.virtualFilename} (from ${f.serverFilename})`).join('\n')}`);

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
        UI.updateConsole('Please start WebChucK first.');
        return { success: false, message: "WebChucK not connected." };
    }
     if (!sampleNames || sampleNames.length === 0) {
         UI.updateConsole("No sample names provided for preloading.");
         return { success: true, message: "No samples specified." };
     }

    UI.updateConsole(`Working file list for samples: ${sampleNames.join(', ')}`);
    UI.setPreloadStatus(`Working files for ${sampleNames.length} samples...`);

    try {
        // First, let's normalize all \\, /, ' ', and _ in sampleNames to be _
        sampleNames = sampleNames.map(sample => sample.replace(/\\|\/| |_/g, '_'));

        // Next, we iterate over each and pass as q parameter to the server in a get fetch
        const filesToPreload = [];
        for (const sample of sampleNames) {
            const response = await fetch(`${SERVER_URL}/api/audio?q=${sample}`);
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            const data = await response.json();
            filesToPreload.push(...data.files);
        }
        // // First, we transform sampleNames by replacing all but the last two underscores with a space, then splitting by space and keeping the last item in the list
        // const usefulbits = sampleNames.map(sample => sample.replace(/_+(?=[^_]*$)/, ' ').split(' ').pop());
        //
        // // Get a unique list of words from sampleNames by splitting each with space and underscore
        // const sampleKeywords = [...new Set(sampleNames.flatMap(sample => sample.split(/[_\s]/)))];

        // // First get a unique set of words from the samples, including count for each word
        // const wordCounts = {};
        // sampleNames.forEach(sample => {
        //     sample.split(/[_\s]/).forEach(word => {
        //         wordCounts[word] = (wordCounts[word] || 0) + 1;
        //     });
        // });
        // // Sort the words by their count in descending order
        // const sortedWords = Object.keys(wordCounts).sort((a, b) => wordCounts[b] - wordCounts[a]);
        //
        // // Unless this reduces the list to zero, remove all words with the same count as sampleNames.length
        // if (sortedWords.length > 0 && wordCounts[sortedWords[0]] === sampleNames.length) {
        //     sampleNames = sampleNames.map(sample => sample.split(/[_\s]/).filter(word => word !== sortedWords[0]).join('_'));
        // }

        // We double-check our logic for the above in a comment:
        // If we have a list of samples like ["accordion_C4", "accordion_C5", "accordion_C6"],
        // and the word "accordion" appears in all of them, we remove "accordion" from each sample name.
        // Unless this reduces the list to zero, remove all words with the same count as sampleNames.length

        // Get all available audio files from the server
        // const response = await fetch(`${SERVER_URL}/api/audio`);
        //  if (!response.ok) {
        //     throw new Error(`Server responded with status: ${response.status}`);
        // }
        // const data = await response.json();
        // const allFiles = data.files || []; // Expecting relative paths from public root
        //
        // // Filter files based on the sample list
        // const filesToPreload = allFiles.filter(fileRelativePath => {
        //     // Check if the file path starts with any of the requested sample names/prefixes
        //     return sampleNames.some(sample =>
        //          fileRelativePath.replaceAll(/\\\\/g, "/").includes(sample) // e.g., some_dir/accordion/C4.wav
        //     );
        // });
        //
        if (filesToPreload.length === 0) {
        // if (sampleNames.length === 0) {
            const warningMsg = `No matching files found on server for samples: ${sampleNames.join(', ')}`;
             UI.updateConsole(warningMsg);
             UI.setPreloadStatus(warningMsg);
             return { success: false, message: warningMsg }; // Fail if no files found
        }

         // UI.updateConsole(`Found ${filesToPreload.length} files to preload.`);

        // Call the actual file preloader
        return await preloadChuckFiles(filesToPreload);
        // return await preloadChuckFiles(sampleNames);

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
