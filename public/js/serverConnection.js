// js/serverConnection.js
import * as UI from './ui.js';
import * as WebChuckService from './webchuckService.js';
import * as LibraryService from './libraryService.js';
import { WS_URL, SERVER_URL } from './config.js';
import ParameterControl from "./parameterControl.js";

let serverSocket = null;
let sessionId = null;
let reconnectInterval = null;
let reconnectAttempts = 0; // Track reconnect attempts
const MAX_RECONNECT_ATTEMPTS = 10; // Stop trying after N attempts
const INITIAL_RECONNECT_DELAY_MS = 3000; // Start with 3 seconds
const MAX_RECONNECT_DELAY_MS = 30000; // Max delay 30 seconds

// --- WebSocket Setup ---
let firstConnect = true;
function connectWebSocket() {
    if (serverSocket && (serverSocket.readyState === WebSocket.OPEN || serverSocket.readyState === WebSocket.CONNECTING)) {
        UI.updateConsole('WebSocket already open or connecting.');
        return;
    }

     // Clear any previous reconnect interval
    if (reconnectInterval) {
        clearTimeout(reconnectInterval);
        reconnectInterval = null;
    }

    UI.updateConsole(`Connecting to WebSocket server at ${WS_URL}...`);
    UI.setConnectionStatus('<span class="yellow">Connecting to Server...</span>');

    serverSocket = new WebSocket(WS_URL);

    serverSocket.onopen = () => {
        UI.setConnectionDotStatus('connected');
        UI.setConnectionStatus('');
        UI.setConnectionStatusTitleText('Connected');

        UI.updateConsole('WebSocket connection established.');
        UI.enableServerControls(true);
        if (firstConnect)
        {
            firstConnect = false;
            const result = LibraryService.getSystemSnippet("hello-world");
            const snippet =
                result.success
                    ? result.code
                    : UI.getCodeEditorValue();
            WebChuckService.runCode(snippet)
                .catch(error => {
                    UI.updateConsole(`Error running system snippet: ${error.message}`);
                });
        }
        if (UI.isConnectionStatusSectionExpanded()) {
            UI.toggleConnectionStatusSection();
        }
        // Reset reconnect attempts on successful connection
        reconnectAttempts = 0;
        if (reconnectInterval) {
            clearTimeout(reconnectInterval);
            reconnectInterval = null;
            UI.updateConsole("Automatic reconnection successful.");
        }
        // Update button text (moved from handleConnectServer)
        UI.DOMElements.connectServerBtn().innerHTML = 'Disconnect from Server';
        // Enable name setting controls
        UI.enableSessionNameControls(true);
    };

    serverSocket.onmessage = handleWebSocketMessage;

    serverSocket.onclose = (event) => {
        const reason = event.reason || `Code ${event.code}`;
        UI.updateConsole(`WebSocket connection closed: ${reason}`);
        UI.setConnectionStatus('<span class="red">Disconnected from Server</span>');
        UI.enableServerControls(false);
        UI.DOMElements.connectServerBtn().textContent = 'Connect to Server';
        UI.setConnectionDotStatus('connecting');
        setSessionId(null); // Clear session ID on disconnect
        serverSocket = null; // Clear the instance

        // Disable name setting controls
        UI.enableSessionNameControls(false);

        // --- Auto-reconnect Logic ---
        if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) { // Don't reconnect on normal closure (code 1000) or too many attempts
            reconnectAttempts++;
            // Exponential backoff
            const delay = Math.min(INITIAL_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY_MS);
            UI.updateConsole(`Attempting reconnect #${reconnectAttempts} in ${delay / 1000} seconds...`);
            if (reconnectInterval) clearTimeout(reconnectInterval); // Clear existing timer just in case
            reconnectInterval = setTimeout(connectWebSocket, delay); // Use setTimeout for backoff
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            UI.updateConsole("Max reconnection attempts reached. Please connect manually.");
            if (reconnectInterval) clearTimeout(reconnectInterval);
            reconnectInterval = null;
        } else {
            UI.updateConsole("WebSocket closed normally. Auto-reconnect stopped.");
            if (reconnectInterval) clearTimeout(reconnectInterval);
            reconnectInterval = null;
        }
        // --- End Auto-reconnect Logic ---
    };

     serverSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        UI.updateConsole(`WebSocket error: ${error?.message || 'Unknown error'}. Check console.`);
        UI.setConnectionStatus('<span class="red">Connection Error</span>');
        const result = LibraryService.getSystemSnippet("socket-error");
        if (result.success) {
            WebChuckService.runCode(result.code)
                .catch(error => {
                    UI.updateConsole(`Error running system snippet: ${error.message}`);
                });
        }
        // Don't disable server controls here, let onclose handle state and reconnect
        // UI.enableServerControls(false);
        // UI.setSessionId(null);

        // Close might not fire after error, ensure cleanup and attempt reconnect
        if (serverSocket && serverSocket.readyState !== WebSocket.OPEN && serverSocket.readyState !== WebSocket.CONNECTING) {
             try { serverSocket.close(); } catch(e){} // Force close if possible
             serverSocket = null;
              // Trigger reconnect manually if not already scheduled by onclose
              if (!reconnectInterval && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                 handleReconnectAttempt(); // Use a helper to avoid duplication
             }
        }
    };
}

// Helper for scheduling reconnect attempts
function handleReconnectAttempt() {
    if (reconnectInterval) return; // Already scheduled
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        UI.updateConsole("Max reconnection attempts reached. Please connect manually.");
        return;
    }
    reconnectAttempts++;
    const delay = Math.min(INITIAL_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY_MS);
    UI.updateConsole(`Attempting reconnect #${reconnectAttempts} in ${delay / 1000} seconds... (Triggered by error)`);
    reconnectInterval = setTimeout(connectWebSocket, delay);
}

function disconnectWebSocket() {
    // Clear reconnect timer when user manually disconnects
    if (reconnectInterval) {
        clearTimeout(reconnectInterval); // Use clearTimeout now
        reconnectInterval = null;
        UI.updateConsole("Stopped automatic reconnection attempts.");
    }
    reconnectAttempts = 0; // Reset attempts on manual disconnect

    // UI.DOMElements.startWebChuckBtn().classList.remove('hidden');

    if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
        serverSocket.close(1000, "User initiated disconnect"); // Normal closure code 1000
        UI.updateConsole("Disconnecting from server...");
    } else {
        UI.updateConsole("Already disconnected.");
        // Ensure UI state is correct even if already disconnected
        UI.setConnectionStatus('<span class="red">Disconnected from Server</span>');
        UI.enableServerControls(false);
        UI.DOMElements.connectServerBtn().textContent = 'Connect to Server';
        setSessionId(null);
        serverSocket = null;
    }
}

// Public connect/disconnect functions
export function connectToServer() {
    connectWebSocket();
}
export function disconnectFromServer() {
     disconnectWebSocket();
}


// --- Message Handling ---

// Sanitize incoming 'execute_code' messages (from original code)
function parseExecuteCodeMessage(data) {
    if (data.type !== 'execute_code' || typeof data.code !== 'string') {
        return data; // Return as-is if not relevant type or code isn't string
    }
    // Check if it looks like stringified JSON containing a `code` property
    const codeTrimmed = data.code.trim();
    if (codeTrimmed.startsWith('{') && codeTrimmed.endsWith('}') && codeTrimmed.includes('"code":')) {
        try {
            const parsed = JSON.parse(data.code);
            if (parsed && typeof parsed.code === 'string') {
                console.log("Parsed nested code string from execute_code message.");
                // Return a new object with the correctly extracted code
                return { ...data, code: parsed.code };
            }
        } catch (e) {
            console.warn("Received execute_code with stringified JSON, but failed to parse. Using as-is.", e);
        }
    }
    return data; // Return original data if parsing fails or conditions not met
}


async function handleWebSocketMessage(event) {
    try {
        let data = JSON.parse(event.data);
        console.log("WebSocket message received (raw):", data);

        // Apply sanitization/parsing if needed (e.g., for execute_code)
        if (data.type === 'execute_code') {
             data = parseExecuteCodeMessage(data);
             console.log("Message after parseExecuteCodeMessage:", data);
        }


        switch (data.type) {
            case 'session_created':
                sessionId = data.sessionId;
                UI.setConnectionStatus(`<span class="green" style="font-size: 0.6em;">${sessionId}</span>`);
                UI.updateConsole(`Session created: ${sessionId}`);
                 // Enable server interactions now that we have a session
                 UI.enableServerControls(true);
                break;

            case 'execute_code':
                UI.updateConsole(`Executing code from server...`);
                // Set code in editor for user visibility
                if (typeof data.code === 'string') {
                     UI.setCodeEditorValue(data.code);
                } else {
                    UI.updateConsole("Received non-string code from server.");
                    UI.setCodeEditorValue(JSON.stringify(data.code, null, 2)); // Display JSON if not string
                }
                const execSuccess = await WebChuckService.runCode(data.code);
                // Send captured messages back after execution attempt
                sendConsoleMessagesToServer();
                // Send execution result *back to server*? (Original didn't seem to)
                 if (!execSuccess) {
                     sendExecutionErrorToServer("Failed during WebChuckService.runCode execution.");
                 }
                break;

            case 'stop_execution':
                UI.updateConsole(`Stopping code execution from server...`);
                await WebChuckService.stopChuck();
                // Send confirmation back?
                break;

            case 'audio_saved': // Server confirms audio saved (if server-side saving is used)
                UI.updateConsole(`Server confirmed audio saved: ${data.filename}`);
                break;

            case 'preload_samples':
                // This message comes from the AI/Server asking the client to preload
                if (data.samples && Array.isArray(data.samples)) {
                    UI.updateConsole(`Received request to preload: ${data.samples.join(', ')}`);
                    // Call preload function
                     const result = await WebChuckService.preloadSamplesByName(data.samples);
                     // Send result back to server
                    sendMessageToServer(result.success ? 'preload_complete' : 'preload_error', result);
                } else {
                     UI.updateConsole("Invalid 'preload_samples' message received.", data);
                     sendMessageToServer('preload_error', { error: 'Invalid samples data received by client.' });
                }
                break;

            // Add case for server confirming rename
            case 'session_renamed_ack': // Server confirms rename
                UI.updateConsole(`Server confirmed session renamed to: ${data.name}`);
                if (typeof UI.setSessionNameInput === 'function') {
                    UI.setSessionId(`Renamed to ${data.name}`);
                    UI.setSessionNameInput(data.name); // Update input field
                }
                break;

            // Add case for error during rename
            case 'rename_session_error':
                UI.updateConsole(`Error renaming session: ${data.error}`);
                break;
                 
            // Set Parameter Value
            case 'set_parameter_value':
                UI.updateConsole(`Setting ${data.payload.name}: to ${data.payload.value}`);
                const tween = parseFloat(data.payload.tween);
                const newValue = parseFloat(data.payload.value);
                if (tween > 0)
                {
                    const theChuck = WebChuckService.getChuckInstance();

                    if (!theChuck) {
                        UI.updateConsole('WebChucK needs to be running to set parameter values');
                        break;
                    }

                    // Sending the message immediately so we don't wait for the tween.
                    sendMessageToServer("set_parameter_value", { name: data.payload.name, value: data.payload.value });

                    const startValue = parseFloat(await ParameterControl.getParameterValue(data.payload.name));
                    let timePassed = 0;
                    const slider = document.getElementById(`param-${data.payload.name}`)
                    const valueDisplay = document.getElementById(`param-value-${data.payload.name}`)
                    const interval = setInterval(async () => {
                        const value = startValue + ((newValue - startValue) * (timePassed / (tween * 1000)));

                        await ParameterControl.updateParameter(data.payload.name, undefined, value);
                        slider.value = value;
                        valueDisplay.textContent = (Math.round(value * 100)/100).toFixed(2);

                        if (timePassed > tween * 1000) {
                            clearInterval(interval);
                        }
                        timePassed += 15;
                    }, 15);
                }
                else {
                    await ParameterControl.updateParameter(data.payload.name, undefined, data.payload.value);
                    sendMessageToServer("set_parameter_value", { name: data.payload.name, value: data.payload.value });
                }
                break;

            // Set Parameter Value
            case 'get_parameter_value':
                UI.updateConsole(`Getting ${data.name}`);
                const value = await ParameterControl.getParameterValue(data.payload.name);
                sendMessageToServer("get_parameter_value", { name: data.payload.name, value });
                break;

            // Play code from library
            case 'play_from_library':
            if (!data.name) {
                    UI.updateConsole('Error: No snippet name provided for play_from_library');
                    break;
                }
                
                UI.updateConsole(`Server requested to play snippet: ${data.name}`);
                const result = LibraryService.loadSnippet(data.name);
                
                if (!result.success) {
                    UI.updateConsole(`Error: ${result.message}`);
                    sendMessageToServer('play_from_library_error', { name: data.name, error: result.message });
                    break;
                }
                
                // Set the code in the editor
                UI.setCodeEditorValue(result.code);
                
                // Run the code
                WebChuckService.runCode(result.code)
                    .then(success => {
                        if (success) {
                            UI.updateConsole(`Successfully playing snippet: ${data.name}`);
                            sendMessageToServer('play_from_library_success', { name: data.name });
                        } else {
                            UI.updateConsole(`Failed to play snippet: ${data.name}`);
                            sendMessageToServer('play_from_library_error', { name: data.name, error: 'Execution failed' });
                        }
                    })
                    .catch(error => {
                        UI.updateConsole(`Error playing snippet: ${error.message}`);
                        sendMessageToServer('play_from_library_error', { name: data.name, error: error.message });
                    });
                break;

            default:
                UI.updateConsole(`Received unknown message type: ${data.type}`);
                console.log("Unhandled message data:", data);
        }
    } catch (error) {
        console.error('Error parsing or handling WebSocket message:', error);
        UI.updateConsole(`Error processing message: ${error.message}`);
        // Send error back to server?
        sendMessageToServer('error', { message: `Client error processing message: ${error.message}` });
    }
}

// --- Sending Messages ---

export function sendMessageToServer(type, payload = {}) {
    if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
        try {
            serverSocket.send(JSON.stringify({ type, sessionId, ...payload })); // Include sessionId automatically
            return true;
        } catch (error) {
            console.error(`Error sending WebSocket message type ${type}:`, error);
            UI.updateConsole(`Error sending message: ${error.message}`, true, "error");
            return false;
        }
    } else {
        UI.updateConsole('Cannot send message: WebSocket not connected.');
        return false;
    }
}

// Send captured console logs periodically or after execution
export function sendConsoleMessagesToServer() {
    const messages = WebChuckService.getAndClearCapturedMessages();
    if (messages.length > 0) {
        sendMessageToServer('console_messages', { messages });
    }
}
// Consider calling sendConsoleMessagesToServer() periodically via setInterval if needed

// Helper to send execution errors
export function sendExecutionErrorToServer(errorMessage) {
    const result = LibraryService.getSystemSnippet("error");
    if (result.success) {
        WebChuckService.runCode(result.code)
            .catch(error => {
                UI.updateConsole(`Error running system snippet: ${error.message}`);
            });
    }
     sendMessageToServer('execute_code_error', { error: errorMessage });
}
// Helper to send preload errors explicitly if needed
export function sendPreloadErrorToServer(errorMessage) {
    const result = LibraryService.getSystemSnippet("error");
    if (result.success) {
        WebChuckService.runCode(result.code)
            .catch(error => {
                UI.updateConsole(`Error running system snippet: ${error.message}`);
            });
    }
    sendMessageToServer('preload_error', { error: errorMessage });
}

// --- API Interaction ---
// Example: Fetching samples list via API
export async function fetchSamplesList(searchQuery = '') {
     if (!serverSocket || serverSocket.readyState !== WebSocket.OPEN) {
        UI.updateConsole('Please connect to the server first to load samples.');
        return null; // Indicate failure
    }
    try {
        UI.updateConsole(searchQuery ? `Searching for samples matching "${searchQuery}"...` : "Fetching all samples...");
        
        let apiUrl = `/api/audio`;
        if (searchQuery) {
            apiUrl += `?q=${encodeURIComponent(searchQuery)}`;
        }
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        const data = await response.json();
         
        const filesFound = data.files?.length || 0;
        UI.updateConsole(searchQuery 
            ? `Found ${filesFound} sample(s) matching "${searchQuery}"`
            : `Found ${filesFound} sample(s)`);
            
        return data.files; // Return the list of relative paths
    } catch (error) {
        console.error('Error loading samples list:', error);
        UI.updateConsole(`Error loading samples: ${error.message}`);
        return null; // Indicate failure
    }
}

// Example: Uploading a file via API
export async function uploadFile(file) {
    if (!file) {
        UI.updateConsole('No file selected for upload.');
        return false;
    }
     if (!serverSocket || serverSocket.readyState !== WebSocket.OPEN) {
        UI.updateConsole('Please connect to the server first to upload.');
        return false;
    }

    UI.updateConsole(`Uploading file: ${file.name}...`);
    try {
        // Read file as ArrayBuffer for raw upload
        const arrayBuffer = await file.arrayBuffer();

        const response = await fetch(`}/api/upload`, {
            method: 'POST',
            body: arrayBuffer,
            headers: {
                // Use standard Content-Type if server expects it, otherwise server handles raw
                // 'Content-Type': file.type || 'application/octet-stream',
                'X-Filename': file.name // Send original filename in header
            }
        });

        const data = await response.json(); // Assuming server always responds with JSON

        if (!response.ok) {
            throw new Error(data.error || `Server responded with status: ${response.status}`);
        }

        UI.updateConsole(`File uploaded successfully: ${data.filename || file.name}`);
        return true; // Indicate success

    } catch (error) {
        console.error('Error uploading file:', error);
        UI.updateConsole(`Error uploading file: ${error.message}`);
        return false; // Indicate failure
    }
}


// --- Session-Specific Debugging ---
export async function fetchDebugExecution() {
    if (!serverSocket || serverSocket.readyState !== WebSocket.OPEN || !sessionId) {
        UI.updateConsole('Please connect to the server first to get debug info.');
        return null;
    }
    try {
        UI.updateConsole("Fetching execution debug data for current session...");
        const response = await fetch(`}/api/debug/execution/${sessionId}`);
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading execution debug data:', error);
        UI.updateConsole(`Error loading debug info: ${error.message}`);
        return null;
    }
}

export async function fetchDebugPreload() {
    if (!serverSocket || serverSocket.readyState !== WebSocket.OPEN || !sessionId) {
        UI.updateConsole('Please connect to the server first to get debug info.');
        return null;
    }
    try {
        UI.updateConsole("Fetching preload debug data for current session...");
        const response = await fetch(`}/api/debug/preload/${sessionId}`);
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading preload debug data:', error);
        UI.updateConsole(`Error loading debug info: ${error.message}`);
        return null;
    }
}

export async function fetchDebugSessions() {
    if (!serverSocket || serverSocket.readyState !== WebSocket.OPEN) {
        UI.updateConsole('Please connect to the server first to get sessions info.');
        return null;
    }
    try {
        UI.updateConsole("Fetching sessions debug data...");
        const response = await fetch(`}/api/debug/sessions`);
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading sessions debug data:', error);
        UI.updateConsole(`Error loading sessions info: ${error.message}`);
        return null;
    }
}

// --- Getters ---
export function getCurrentSessionId() {
    return sessionId;
}

export function isServerConnected() {
    return serverSocket && serverSocket.readyState === WebSocket.OPEN;
}

// Export to share between modules with UI
export function setSessionId(id) {
    sessionId = id;
    UI.setSessionId(id);
}