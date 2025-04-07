// js/libraryService.js
// Library service for saving, loading, and managing ChucK code snippets

// Constants
const STORAGE_KEY = 'webchuck_code_library';

// Initialize library from localStorage
function initLibrary() {
    try {
        const storedLibrary = localStorage.getItem(STORAGE_KEY);
        return storedLibrary ? JSON.parse(storedLibrary) : {};
    } catch (error) {
        console.error('Error initializing code library:', error);
        return {};
    }
}

// Save library to localStorage
function saveLibraryToStorage(library) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
        return true;
    } catch (error) {
        console.error('Error saving code library:', error);
        return false;
    }
}

// Save a code snippet to the library
export function saveSnippet(name, code) {
    if (!name || !code) {
        return { success: false, message: 'Name and code are required' };
    }
    
    const library = initLibrary();
    
    // Check if it already exists (optional: could add overwrite confirmation in UI)
    const alreadyExists = library[name] !== undefined;
    
    // Add timestamp to track when snippets were created/updated
    library[name] = {
        code,
        updatedAt: new Date().toISOString()
    };
    
    const saved = saveLibraryToStorage(library);
    
    return { 
        success: saved, 
        message: saved 
            ? (alreadyExists ? `Updated snippet "${name}"` : `Saved snippet "${name}"`) 
            : 'Failed to save snippet'
    };
}

// Load a code snippet from the library
export function loadSnippet(name) {
    if (!name) {
        return { success: false, message: 'Snippet name is required', code: null };
    }
    
    const library = initLibrary();
    const snippet = library[name];
    
    if (!snippet) {
        return { success: false, message: `Snippet "${name}" not found`, code: null };
    }
    
    return { success: true, message: `Loaded snippet "${name}"`, code: snippet.code };
}

// Delete a code snippet from the library
export function deleteSnippet(name) {
    if (!name) {
        return { success: false, message: 'Snippet name is required' };
    }
    
    const library = initLibrary();
    
    if (library[name] === undefined) {
        return { success: false, message: `Snippet "${name}" not found` };
    }
    
    delete library[name];
    const saved = saveLibraryToStorage(library);
    
    return { 
        success: saved, 
        message: saved ? `Deleted snippet "${name}"` : 'Failed to delete snippet'
    };
}

// List all available snippets
export function listSnippets() {
    const library = initLibrary();
    
    // Transform the library object into an array of objects with name and metadata
    const snippets = Object.entries(library).map(([name, data]) => ({
        name,
        updatedAt: data.updatedAt || 'Unknown',
        // Extract first line or first 30 chars as preview
        preview: data.code.split('\n')[0].substring(0, 30) + 
                 (data.code.split('\n')[0].length > 30 ? '...' : '')
    }));
    
    // Sort by most recently updated
    snippets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    return { 
        success: true, 
        count: snippets.length,
        snippets
    };
}

// Export functions so they're available to other modules
export default {
    saveSnippet,
    loadSnippet,
    deleteSnippet,
    listSnippets
};
