// js/main.js
import * as UI from './ui.js';
import * as WebChuckService from './webchuckService.js';
import * as ServerConnection from './serverConnection.js';
import * as AudioRecorder from './audioRecorder.js';
import * as LibraryService from './libraryService.js';
import { POTENTIAL_SAMPLES } from './config.js'; // For auto-detection
import ParameterControl from './parameterControl.js';
import AudioVisualizer from './audioVisualizer.js';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    UI.updateConsole("DOM loaded. Initializing...");
    setupEventListeners();
    
    // Initial state setup
    UI.enableWebChuckControls(false);
    UI.enableServerControls(false); // Enable server connect button only after WC connect
     
    // Check recording support and update UI if needed
    if (!AudioRecorder.getRecordingState().isSupported) {
        UI.DOMElements.saveBtn().title = "Recording not supported by this browser.";
        // Maybe disable save button permanently here if desired
    }
     
    // Initialize library UI
    refreshLibraryList();
    
    // Initialize theme preference from localStorage or system preference
    initializeTheme();
    
    // Initialize audio visualizer
    AudioVisualizer.initVisualizer();
     
    UI.updateConsole("Ready. Connect to WebChucK to begin.");
});

// --- Theme Management ---
function initializeTheme() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set theme toggle switch based on preference
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = savedTheme === 'dark' || (savedTheme === null && prefersDark);
        
        // Apply theme immediately
        applyTheme(themeToggle.checked);
    }
}

function applyTheme(isDark) {
    // Save preference to localStorage
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Apply data attribute to HTML for potential additional CSS selectors
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

// --- Event Listener Setup ---
function setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            applyTheme(e.target.checked);
        });
    }

    // Connection Buttons
    UI.DOMElements.connectWebChuckBtn().addEventListener('click', handleConnectWebChuck);
    UI.DOMElements.connectServerBtn().addEventListener('click', handleConnectServer);

    // Code Execution Buttons
    UI.DOMElements.runBtn().addEventListener('click', handleRunCode);
    UI.DOMElements.stopBtn().addEventListener('click', handleStopCode);
    UI.DOMElements.saveBtn().addEventListener('click', handleSaveAudio);

    // Session Management
    UI.DOMElements.setSessionNameBtn().addEventListener('click', handleSetSessionName);

    // Sample Preloading
    UI.DOMElements.preloadSamplesBtn().addEventListener('click', handlePreloadSamples);

    // Sample Library
    UI.DOMElements.loadSamplesBtn().addEventListener('click', handleLoadSamples);
    UI.DOMElements.searchSamplesBtn().addEventListener('click', handleSearchSamples);
    // Add keydown event listener to the search input
    UI.DOMElements.sampleSearchInput().addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            handleSearchSamples();
        }
    });
    UI.DOMElements.uploadBtn().addEventListener('click', handleUploadSample);
    UI.DOMElements.recordSampleBtn().addEventListener('click', handleRecordSample);

    // Examples
    UI.DOMElements.loadExampleBtn().addEventListener('click', handleLoadExample);
    
    // Library UI
    UI.DOMElements.saveToLibraryBtn().addEventListener('click', handleSaveToLibrary);
    UI.DOMElements.loadFromLibraryBtn().addEventListener('click', handleLoadFromLibrary);
    UI.DOMElements.deleteFromLibraryBtn().addEventListener('click', handleDeleteFromLibrary);
    UI.DOMElements.refreshLibraryBtn().addEventListener('click', handleRefreshLibrary);
    
    // Library selection change
    const libraryList = UI.DOMElements.libraryList();
    if (libraryList) {
        libraryList.addEventListener('change', UI.updateLibraryButtonStates);
    }
}

// --- Event Handlers ---

async function handleConnectWebChuck() {
    UI.updateConsole("Connect WebChucK button clicked...");
    // Attempt to initialize WebChucK (includes resuming AudioContext)
    const success = await WebChuckService.initWebChuck();
    if (success) {
        // Enable server connection button ONLY after successful WC init
        UI.DOMElements.connectServerBtn().disabled = false;
        UI.updateConsole("WebChucK connected. Now connect to the server.");
        
        // Connect visualizer to WebChucK instance
        const chuckInstance = WebChuckService.getChuckInstance();
        if (chuckInstance) {
            const visualizerConnected = AudioVisualizer.connectToAudio();
            if (visualizerConnected) {
                UI.updateConsole("Audio visualizer connected.");
                AudioVisualizer.startVisualization();
            } else {
                UI.updateConsole("Failed to connect audio visualizer.");
            }

        }
        
        // Optional: Auto-connect to server
        UI.updateConsole("Auto-connecting to server...");
        // setTimeout(handleConnectServer, 600); // Delayed to allow WC to fully initialize
        handleConnectServer();
    } else {
         UI.updateConsole("Failed to connect WebChucK. Check console for errors.");
         // Keep server connect button disabled
         UI.DOMElements.connectServerBtn().disabled = true;
    }
}

function handleConnectServer() {
    // Simple toggle: If connected, disconnect; otherwise, connect.
    if (ServerConnection.isServerConnected()) {
        ServerConnection.disconnectFromServer();
    } else {
        ServerConnection.connectToServer();
    }
    // Button text is now handled by onopen/onclose handlers in serverConnection.js
}

async function preprocessCodeForSamples(code) {
    // Basic sample detection (optional enhancement)
    const samplesInCode = POTENTIAL_SAMPLES.filter(inst => code.includes(inst));
    if (samplesInCode.length > 0) {
        UI.updateConsole(`Detected potential samples: ${samplesInCode.join(', ')}. Attempting preload...`);
        // Don't wait for preload here, run code immediately after *requesting* preload
        // Preloading happens async. User should preload explicitly if required *before* run.
        // Or, implement a more complex flow where run waits for preload completion.
        // For simplicity, we just *start* the preload and run the code.
        WebChuckService.preloadSamplesByName(samplesInCode)
            .then(result => {
                if (!result.success) UI.updateConsole(`Auto-preload warning: ${result.message}`);
            });
    }
}

async function preprocessCodeForParameters(code) {
    // Initialize parameter controls from code
    const hasParams = ParameterControl.initParameterControl(code);
    if (hasParams) {
        UI.updateConsole("Parameter controls initialized.");
    }
}

async function runCode(code) {

    const success = await WebChuckService.runCode(code);

    if (success) {
        await preprocessCodeForSamples(code);

        AudioRecorder.startAudioRecording(); // Start recording when code runs successfully

        await preprocessCodeForParameters(code);

        // Start visualizer
        AudioVisualizer.startVisualization();
    }
    //
    // // Send console messages after execution attempt
    // ServerConnection.sendConsoleMessagesToServer();
}

async function handleRunCode() {
    const code = UI.getCodeEditorValue();
    if (!code) {
        UI.updateConsole("Code editor is empty.");
        return;
    }
    UI.updateConsole("Run Code button clicked.");

    runCode(code);

    // Send console messages after execution attempt
    ServerConnection.sendConsoleMessagesToServer();
}

async function handleStopCode() {
    UI.updateConsole("Stop Code button clicked.");
    AudioRecorder.stopAudioRecording(); // Stop recording when code is stopped
    await WebChuckService.stopChuck();
    
    // Reset parameter controls and stop visualizer
    ParameterControl.resetParameterControl();
    AudioVisualizer.stopVisualization();
    
    // Send console messages after stop attempt
    ServerConnection.sendConsoleMessagesToServer();
}

function handleSaveAudio() {
    UI.updateConsole("Save Audio button clicked.");
    AudioRecorder.saveRecordingLocally(); // Handles stopping if needed, then saves blob
}

async function handlePreloadSamples() {
    const selectedSamples = UI.getSelectedSamples();
    if (selectedSamples.length === 0) {
        UI.setPreloadStatus('Please select at least one sample family.');
        return;
    }
    UI.updateConsole(`Preload button clicked for: ${selectedSamples.join(', ')}`);
    // Use the service function that fetches file list and then preloads
    const result = await WebChuckService.preloadSamplesByName(selectedSamples);
     // Send result back to server IF connected
     if (ServerConnection.isServerConnected()) {
         ServerConnection.sendMessageToServer(
             result.success ? 'preload_complete' : 'preload_error',
             result // Send the whole result object back
         );
     }
}

async function handleLoadSamples() {
     const files = await ServerConnection.fetchSamplesList();
     if (files) {
         // Populate UI list, providing a callback for when a sample is clicked
         UI.populateSamplesList(files, (selectedFilePath) => {
             UI.updateConsole(`Sample clicked: ${selectedFilePath}`);
             // Create simple playback code using the relative path
             const sampleCode = `// Load and play sample: ${selectedFilePath}
SndBuf buf => dac;
"${selectedFilePath}" => buf.read; // Use the relative path directly
0.5 => buf.gain;
buf.play(); // Start playback
// Optional: Stop after duration - buf.length() => now;
`;
             UI.setCodeEditorValue(sampleCode);
         });
     }
}

async function handleSearchSamples() {
    const searchQuery = UI.getSampleSearchQuery();
    if (!searchQuery) {
        handleLoadSamples(); // If empty, just load all samples
        return;
    }
    
    const files = await ServerConnection.fetchSamplesList(searchQuery);
    if (files) {
        // Populate UI list with search results, using the same callback as handleLoadSamples
        UI.populateSamplesList(files, (selectedFilePath) => {
            UI.updateConsole(`Sample clicked: ${selectedFilePath}`);
            // Create simple playback code using the relative path
            const sampleCode = `// Load and play sample: ${selectedFilePath}
SndBuf buf => dac;
"${selectedFilePath}" => buf.read; // Use the relative path directly
0.5 => buf.gain;
buf.play(); // Start playback
// Optional: Stop after duration - buf.length() => now;
`;
            UI.setCodeEditorValue(sampleCode);
        });
    }
}

async function handleUploadSample() {
    const file = UI.getFileUploadFile();
    if (!file) {
        UI.updateConsole("No file selected to upload.");
        return;
    }
    const success = await ServerConnection.uploadFile(file);
    if (success) {
        // Refresh the samples list after successful upload
         handleLoadSamples();
    }
}

async function handleRecordSample() {
    if (!ServerConnection.isServerConnected()) {
        UI.updateConsole("Please connect to the server first to record samples.");
        return;
    }

    // Get filename from input
    const filename = UI.getRecordSampleName();
    
    // Update UI to indicate recording is in progress
    UI.setRecordButtonState(true);
    UI.updateConsole(`Recording sample as "${filename}"...`);
    
    try {
        // Record the sample
        const result = await AudioRecorder.recordAndSaveSample(filename);
        
        // Reset UI
        UI.setRecordButtonState(false);
        
        if (result.success) {
            UI.updateConsole(result.message);
            UI.clearRecordSampleName();
            
            // Refresh the samples list to show the new sample
            handleLoadSamples();
        } else {
            UI.updateConsole(`Recording failed: ${result.message}`);
        }
    } catch (error) {
        // Reset UI in case of error
        UI.setRecordButtonState(false);
        UI.updateConsole(`Error recording sample: ${error.message}`);
        console.error("Error in handleRecordSample:", error);
    }
}

// Handle setting the session name
function handleSetSessionName() {
    const name = UI.getSessionNameInput();
    const currentSessionId = ServerConnection.getCurrentSessionId();
    
    if (!currentSessionId) {
        UI.updateConsole("Not connected to server or no session ID.");
        return;
    }
    
    if (!name) {
        UI.updateConsole("Please enter a name for the session.");
        return;
    }
    
    UI.updateConsole(`Requesting to rename session ${currentSessionId} to "${name}"...`);
    ServerConnection.sendMessageToServer('rename_session', { name: name });
}

// --- Library Event Handlers ---

function handleSaveToLibrary() {
    const code = UI.getCodeEditorValue();
    if (!code.trim()) {
        UI.updateConsole("Cannot save: Editor is empty");
        return;
    }
    
    // Prompt user for a name
    const snippetName = prompt("Enter a name for this code snippet:");
    if (!snippetName) {
        UI.updateConsole("Save cancelled");
        return;
    }
    
    // Save to library
    const result = LibraryService.saveSnippet(snippetName, code);
    UI.updateConsole(result.message);
    
    // Refresh the library list
    refreshLibraryList();
}

function handleLoadFromLibrary() {
    const snippetName = UI.getSelectedSnippetName();
    if (!snippetName) {
        UI.updateConsole("No snippet selected to load");
        return;
    }
    
    // Load from library
    const result = LibraryService.loadSnippet(snippetName);
    
    if (result.success) {
        UI.setCodeEditorValue(result.code);
        UI.updateConsole(result.message);
    } else {
        UI.updateConsole(`Error: ${result.message}`);
    }
}

function handleDeleteFromLibrary() {
    const snippetName = UI.getSelectedSnippetName();
    if (!snippetName) {
        UI.updateConsole("No snippet selected to delete");
        return;
    }
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${snippetName}"?`)) {
        UI.updateConsole("Delete cancelled");
        return;
    }
    
    // Delete from library
    const result = LibraryService.deleteSnippet(snippetName);
    UI.updateConsole(result.message);
    
    // Refresh the library list
    refreshLibraryList();
}

function handleRefreshLibrary() {
    refreshLibraryList();
}

function refreshLibraryList() {
    const result = LibraryService.listSnippets();
    
    if (result.success) {
        UI.populateLibraryList(result.snippets);
        UI.updateConsole(`Found ${result.count} saved snippet(s)`);
    } else {
        UI.updateConsole("Error loading snippets");
    }
}

function handleLoadExample() {
    const exampleKey = UI.getSelectedExample();
    if (!exampleKey) return;

    let code = '';
    let description = ''; // Optional: Add descriptions for examples

    // --- Example Code Snippets ---
    switch (exampleKey) {
        case 'simple-sine':
            code = `// Simple sine wave oscillator\nSinOsc s => dac;\n0.5 => s.gain;\n220 => s.freq;\n2::second => now;`;
            break;
        case 'fm-synthesis':
            code = `// FM synthesis example\nSinOsc modulator => SinOsc carrier => dac;\n0.5 => carrier.gain;\n440 => carrier.freq;\n300 => modulator.freq;\n1000 => modulator.gain;\n5::second => now;`;
            break;
        case 'file-playback':
            // IMPORTANT: This needs a valid *relative* path for a preloaded file
            code = `// File playback example\n// Ensure 'audio_files/kick.wav' (or similar) is available/preloaded\nSndBuf buf => dac;\n"audio_files/kick.wav" => buf.read; // Use relative path\n0.5 => buf.gain;\nbuf.play();\n// buf.length() => now; // Optional stop`;
            break;
        case 'audio-effects':
            code = `// Audio effects chain example\nSinOsc s => JCRev reverb => Echo echo => dac;\n0.5 => s.gain;\n220 => s.freq;\n0.1 => reverb.mix;\n500::ms => echo.delay;\n0.5 => echo.mix;\n0.7 => echo.gain;\n5::second => now;`;
            break;
        case 'stereo-panning':
            code = `// Stereo panning example\nSinOsc s => Pan2 pan => dac;\n0.5 => s.gain;\n440 => s.freq;\n-1.0 => pan.pan; 1::second => now;\n-0.5 => pan.pan; 1::second => now;\n0.0 => pan.pan; 1::second => now;\n0.5 => pan.pan; 1::second => now;\n1.0 => pan.pan; 1::second => now;`;
            break;
        case 'sequencer':
            // IMPORTANT: Needs valid relative paths for preloaded files
            code = `// Simple sequencer example\n// Ensure samples like 'audio_files/kick.wav' are available/preloaded\nSndBuf kick => dac; SndBuf snare => dac; SndBuf hihat => dac;\n"audio_files/kick.wav" => kick.read;\n"audio_files/snare.wav" => snare.read;\n"audio_files/hihat.wav" => hihat.read;\n0.5 => kick.gain; 0.4 => snare.gain; 0.3 => hihat.gain;\nkick.samples() => kick.pos; snare.samples() => snare.pos; hihat.samples() => hihat.pos;\n0.5::second => dur beat;\nfor (0 => int i; i < 8; i++) {\n if (i == 0 || i == 4) { 0 => kick.pos; }\n if (i == 2 || i == 6) { 0 => snare.pos; }\n 0 => hihat.pos;\n beat => now;\n}`;
            break;
        case 'parameter-control':
            // Example with controllable parameters
            code = `// Parameter Control Example
// Use the sliders to control these parameters in real-time!

// @param float values between 0 and 1
// @range 0.1 1.0
float gain = 0.5;

// @param int values for frequency
// @range 110 880
int freq = 440;

// @param float values for modulation
// @range 1 20
float modAmount = 5.0;

// @param int values for duration
// @range 100 2000
int duration = 500;

SinOsc carrier => dac;
SinOsc modulator => blackhole;

// Set up initial parameters
gain => carrier.gain;
freq => carrier.freq;
20 => modulator.freq;

// Main loop
while (true) {
    // Update parameters from user controls (handled automatically)
    freq + (modulator.last() * modAmount * 100) => carrier.freq;
    10::ms => now;
}`;
            break;
    }
    // --- End Example Snippets ---

    UI.setCodeEditorValue(code);
    UI.updateConsole(`Loaded example: ${exampleKey}`);
}
