// js/ui.js

// --- Element Selectors ---
// Encapsulate getting elements to avoid repetition
import * as WebChuckService from "./webchuckService.js";
import * as ServerConnection from "./serverConnection.js";

const DOMElements = {
    // Connection Elements
    connectionStatusSection: () => document.getElementById('connection-status-section'),
    connectionStatusSectionTitle: () => document.getElementById('connection-status-section-title'),
    connectionStatusSectionTitleText: () => document.getElementById('connection-status-section-title-text'),
    startWebChuckBtn: () => document.getElementById('start-webchuck-btn'),
    connectServerBtn: () => document.getElementById('connect-server-btn'),
    runBtn: () => document.getElementById('run-btn'),
    stopBtn: () => document.getElementById('stop-btn'),
    saveBtn: () => document.getElementById('save-btn'),
    codeLibraryBtn: () => document.getElementById('code-library-btn'),
    codeEditorBtn: () => document.getElementById('code-editor-btn'),
    codeEditor: () => document.getElementById('code-editor'),
    codeEditorSection: () => document.getElementById('code-editor-section'),
    codeLibrarySection: () => document.getElementById('code-library-section'),
    consoleOutput: () => document.getElementById('console-output'),
    uploadSampleSection: () => document.getElementById('upload-subsection'),
    recordSampleSection: () => document.getElementById('record-subsection'),
    searchSamplesSection: () => document.getElementById('sample-library-search'),
    connectionStatus: () => document.getElementById('connection-status'),
    connectionStatusDot: () => document.getElementById('status-dot'),
    sessionIdElement: () => document.getElementById('session-id'),
    sessionNameInput: () => document.getElementById('session-name-input'),
    setSessionNameBtn: () => document.getElementById('set-session-name-btn'),

    // Sample Library Elements
    loadSamplesBtn: () => document.getElementById('load-samples-btn'),
    searchSamplesBtn: () => document.getElementById('search-samples-btn'),
    sampleSearchInput: () => document.getElementById('sample-search'),
    samplesList: () => document.getElementById('samples-list'),
    fileUpload: () => document.getElementById('file-upload'),
    uploadBtn: () => document.getElementById('upload-btn'),
    recordNameInput: () => document.getElementById('record-name-input'),
    recordSampleBtn: () => document.getElementById('record-sample-btn'),

    // Examples Elements
    examplesDropdown: () => document.getElementById('examples-dropdown'),
    loadExampleBtn: () => document.getElementById('load-example-btn'),

    // Sample Elements
    preloadSamplesBtn: () => document.getElementById('preload-samples-btn'),
    doUploadSamplesBtn: () => document.getElementById('do-upload-btn'),
    doRecordSamplesBtn: () => document.getElementById('do-record-btn'),
    cancelUploadSamplesBtn: () => document.getElementById('cancel-upload-btn'),
    cancelRecordSamplesBtn: () => document.getElementById('cancel-record-btn'),
    sampleKeywordSelect: () => document.getElementById('sample-keywords'),
    preloadStatus: () => document.getElementById('preload-status'),

    // Library UI elements
    saveToLibraryBtn: () => document.getElementById('save-to-library-btn'),
    loadFromLibraryBtn: () => document.getElementById('load-from-library-btn'),
    deleteFromLibraryBtn: () => document.getElementById('delete-from-library-btn'),
    refreshLibraryBtn: () => document.getElementById('refresh-library-btn'),
    libraryList: () => document.getElementById('library-list'),

    // New Phase 3-4 Elements
    themeToggle: () => document.getElementById('theme-toggle'),
    parameterControls: () => document.getElementById('parameter-controls'),

    // Visualizer Elements
    waveformCanvas: () => document.getElementById('waveform-canvas'),
    spectrumCanvas: () => document.getElementById('spectrum-canvas'),
    levelMeterCanvas: () => document.getElementById('level-meter-canvas'),
    visualizerContainer: () => document.getElementById('visualizer-container'),
    spectrumGroup: () => document.getElementById('spectrum-group'),
    levelGroup: () => document.getElementById('level-group'),
};

// --- UI Update Functions ---

export function updateConsole(message, append = true, type = 'log') {
    const consoleEl = DOMElements.consoleOutput();
    if (consoleEl) {
        let html = (append ? consoleEl.innerHTML + '\n' : '');
        const htmlLines = html.split('\n');
        if (htmlLines.length > 200) { // Keep last 200 lines
            html = htmlLines.slice(-200).join('\n');
        }
        html += `<pre class="${type}">${message}</pre>`;
        consoleEl.innerHTML = html;
        consoleEl.scrollTop = consoleEl.scrollHeight; // Auto-scroll
    } else {
        console.warn("Console output element not found.");
    }
}

export function isConnectionStatusSectionExpanded() {
    return DOMElements.connectionStatusSection().classList.contains('expanded');
}

export function toggleConnectionStatusSection() {
    const connectionStatusSection = DOMElements.connectionStatusSection();
    if (!WebChuckService.getChuckInstance() || !ServerConnection.isServerConnected() || !isConnectionStatusSectionExpanded()) {
        connectionStatusSection.classList.add('expanded');
        connectionStatusSection.classList.remove('collapsed');
    } else {
        connectionStatusSection.classList.remove('expanded');
        connectionStatusSection.classList.add('collapsed');
    }
}

export function setConnectionStatusTitleText(text) {
    const titleTextEl = DOMElements.connectionStatusSectionTitleText();
    if (titleTextEl) titleTextEl.textContent = text;
}

export function setConnectionDotStatus(className) {
    const statusDotEl = DOMElements.connectionStatusDot();
    if (statusDotEl) {
        // Remove the connected and connecting css classes
        statusDotEl.classList.remove('connected', 'connecting');
        // Add the new class
        statusDotEl.classList.add(className);
    }
}

export function setConnectionStatus(statusText) {
    const statusEl = DOMElements.connectionStatus();
    if (statusEl) statusEl.innerHTML = statusText;
}

export function setSessionId(sessionId) {
    const sessionEl = DOMElements.sessionIdElement();
    if (sessionEl) sessionEl.textContent = sessionId ? `${sessionId}` : '';
}

export function setPreloadStatus(statusText) {
    const statusEl = DOMElements.preloadStatus();
    if (statusEl) statusEl.textContent = statusText;
}

export function filterSamplesSelector(query) {
    const select = DOMElements.sampleKeywordSelect();
    if (!select) return;
    //split query into words
    const words = query.split(' ');
    select.querySelectorAll('option').forEach(option => {
        option.style.display = words.every(word => option.textContent.toLowerCase().includes(word.toLowerCase())) ? 'block' : 'none';
    });
}

export function populateSamplesList(files, onSampleClick) {
    const listEl = DOMElements.samplesList();
    if (!listEl) return;
    listEl.innerHTML = ''; // Clear previous list

    if (!files || files.length === 0) {
        listEl.innerHTML = '<div>No audio files available or server connection failed.</div>';
        return;
    }

    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        // Display only the filename and it's folder, but store the relative path
        fileItem.textContent = file.split('/').slice(-2).join('/');
        fileItem.dataset.filePath = file; // Store full relative path
        fileItem.addEventListener('click', () => onSampleClick(file)); // Pass relative path
        listEl.appendChild(fileItem);
    });
}

export function getCodeEditorValue() {
    const editor = DOMElements.codeEditor();
    return editor ? editor.value : '';
}

export function setCodeEditorValue(code) {
    const editor = DOMElements.codeEditor();
    if (editor) editor.value = code;
}

export function refreshSampleKeywords() {
    const select = DOMElements.sampleKeywordSelect();
    // Fetch keywords from server endpoint /api/keywords
    fetch('/api/keywords')
        .then(response => response.json())
        .then(data => {
            select.innerHTML = ''; // Clear previous options
            data.keywords.forEach(keyword => {
                const option = document.createElement('option');
                option.value = keyword;
                // Display keyword with spaces instead of underscores, and capitalize first letter
                option.textContent = keyword.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('<span class="error">Error fetching keywords:</span>', error);
        });
}

export function getSelectedSamples() {
    const select = DOMElements.sampleKeywordSelect();
    return select ? Array.from(select.selectedOptions).map(option => option.value) : [];
}

export function getFileUploadFile() {
    const uploader = DOMElements.fileUpload();
    return uploader && uploader.files.length > 0 ? uploader.files[0] : null;
}

export function getSelectedExample() {
    const dropdown = DOMElements.examplesDropdown();
    return dropdown ? dropdown.value : '';
}

// --- Library UI Functions ---

export function toggleCodeLibrary() {
    const codeEditorSection = DOMElements.codeEditorSection();
    const codeLibrarySection = DOMElements.codeLibrarySection();
    if (codeEditorSection && codeLibrarySection) {
        codeEditorSection.classList.toggle('hidden');
        codeLibrarySection.classList.toggle('hidden');
        // Example CSS: .hidden { display: none; }
    }
}

// Populate the library list with saved snippets
export function populateLibraryList(snippets) {
    const list = DOMElements.libraryList();
    if (!list) return;

    // Clear the current list
    list.innerHTML = '';

    if (!snippets || snippets.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No saved snippets';
        option.disabled = true;
        list.appendChild(option);
        return;
    }

    // Add each snippet to the list
    snippets.forEach(snippet => {
        const option = document.createElement('option');
        option.value = snippet.name;
        option.textContent = `${snippet.name} - ${snippet.preview}`;
        option.title = `Last updated: ${new Date(snippet.updatedAt).toLocaleString()}`;
        list.appendChild(option);
    });

    // Enable/disable buttons based on selection
    updateLibraryButtonStates();
}

// Update library button states based on selection
export function updateLibraryButtonStates() {
    const list = DOMElements.libraryList();
    const hasSelection = list && list.selectedIndex !== -1 && list.value !== '';

    const loadBtn = DOMElements.loadFromLibraryBtn();
    const deleteBtn = DOMElements.deleteFromLibraryBtn();

    if (loadBtn) loadBtn.disabled = !hasSelection;
    if (deleteBtn) deleteBtn.disabled = !hasSelection;
}

// Get the selected snippet name from the library list
export function getSelectedSnippetName() {
    const list = DOMElements.libraryList();
    return list && list.selectedIndex !== -1 ? list.value : null;
}

// Get the sample search query
export function getSampleSearchQuery() {
    const searchInput = DOMElements.sampleSearchInput();
    return searchInput ? searchInput.value.trim() : '';
}

// Clear the sample search input
export function clearSampleSearchQuery() {
    const searchInput = DOMElements.sampleSearchInput();
    if (searchInput) searchInput.value = '';
}

// Get the record sample name
export function getRecordSampleName() {
    const nameInput = DOMElements.recordNameInput();
    const name = nameInput ? nameInput.value.trim() : '';
    return name || `sample-${Date.now()}.wav`; // Default name if none provided
}

// Clear the record sample name
export function clearRecordSampleName() {
    const nameInput = DOMElements.recordNameInput();
    if (nameInput) nameInput.value = '';
}

// Set the record button state
export function setRecordButtonState(isRecording) {
    const btn = DOMElements.recordSampleBtn();
    if (btn) {
        if (isRecording) {
            btn.classList.add('recording');
            btn.textContent = 'Recording...';
            btn.disabled = true;
        } else {
            btn.classList.remove('recording');
            btn.textContent = 'Record (5s)';
            btn.disabled = false;
        }
    }
}

// --- Theme Functions ---

export function setTheme(isDark) {
    // Save preference to localStorage
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    // Apply data attribute to HTML
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Update toggle if it exists
    const toggle = DOMElements.themeToggle();
    if (toggle && toggle.checked !== isDark) {
        toggle.checked = isDark;
    }
}

export function getThemePreference() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    return savedTheme === 'dark' || (savedTheme === null && prefersDark);
}

// --- Visualizer UI Functions ---

export function resizeVisualizers() {
    const container = DOMElements.visualizerContainer();
    if (!container) return;

    const waveformCanvas = DOMElements.waveformCanvas();
    const spectrumCanvas = DOMElements.spectrumCanvas();
    const levelMeterCanvas = DOMElements.levelMeterCanvas();

    if (waveformCanvas) {
        waveformCanvas.width = container.clientWidth * 0.9;
        waveformCanvas.height = 100;
    }

    if (spectrumCanvas) {
        spectrumCanvas.width = container.clientWidth * 0.9;
        spectrumCanvas.height = 100;
    }

    if (levelMeterCanvas) {
        levelMeterCanvas.width = 30;
        levelMeterCanvas.height = 200;
    }
}

// --- Enable/Disable UI Elements ---

export function enableWebChuckControls(enabled) {
    DOMElements.runBtn().disabled = !enabled;
    DOMElements.stopBtn().disabled = !enabled;
    DOMElements.saveBtn().disabled = !enabled;
    DOMElements.preloadSamplesBtn().disabled = !enabled;
    DOMElements.doUploadSamplesBtn().disabled = !enabled;
    DOMElements.doRecordSamplesBtn().disabled = !enabled;
    // Add others if needed
}

export function enableServerControls(enabled) {
    DOMElements.connectServerBtn().disabled = !enabled; // Allow re-connecting

    if (enabled) {
        DOMElements.startWebChuckBtn().classList.add('hidden');
    }
    else
    {
        DOMElements.startWebChuckBtn().classList.remove('hidden');
    }

    DOMElements.loadSamplesBtn().disabled = !enabled;
    DOMElements.searchSamplesBtn().disabled = !enabled;
    DOMElements.uploadBtn().disabled = !enabled;
    // Enable record sample controls
    DOMElements.recordNameInput().disabled = !enabled;
    DOMElements.recordSampleBtn().disabled = !enabled;
    // Enable name setting controls based on connection status
    enableSessionNameControls(enabled);
}

// Function to specifically enable/disable the session name controls
export function enableSessionNameControls(enabled) {
    const nameInput = DOMElements.sessionNameInput();
    const nameButton = DOMElements.setSessionNameBtn();
    if (nameInput) nameInput.disabled = !enabled;
    if (nameButton) nameButton.disabled = !enabled;
}

// Function to get the current session name from input
export function getSessionNameInput() {
    const input = DOMElements.sessionNameInput();
    return input ? input.value.trim() : '';
}

// Function to set the session name input value
export function setSessionNameInput(name) {
    const input = DOMElements.sessionNameInput();
    if (input) input.value = name;
}


// Export the elements object if needed directly in main.js (though functions are preferred)
export {DOMElements};