export interface ClientConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
  isDevelopment: boolean;
}

export function getClientConfig(): ClientConfig {
  const isDevelopment = import.meta.env.MODE !== 'production';

  // In production, use relative paths which will connect to the current host
  // In development, you might want to explicitly set these with environment variables
  const apiBaseUrl = import.meta.env.VITE_API_URL || '';

  // For WebSockets, we need to determine if we're on https or http
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsBaseUrl = import.meta.env.VITE_WS_URL ||
    `${protocol}//${window.location.host}`;

  return {
    apiBaseUrl,
    wsBaseUrl,
    isDevelopment
  };
}

export const HOST = 'localhost'; // Base URL for API calls
export const PORT = 3030; // Base URL for API calls
export const SERVER_URL = `http://${HOST}:${PORT}`; // Base URL for API calls
export const WS_URL = `ws://${HOST}:${PORT}`; // WebSocket URL
export const WEBCHUCK_DIR = './webchuck/'; // Relative path to webchuck dir from HTML
export const MAX_PRELOAD_FILES = 100; // Limit number of files to preload at once

// List of known sample directories/prefixes for detection
export const POTENTIAL_SAMPLES = [
    'accordion', 'acoustic_bass', 'acoustic_grand_piano', 'flute', 'violin',
    'acoustic_guitar_nylon', 'acoustic_guitar_steel', 'alto_sax',
    // Add more based on your server's audio directory structure
];

// Default files if API fetch fails during WebChucK init
export const DEFAULT_AUDIO_FILES = [
    { serverFilename: "./audio_files/kick.wav", virtualFilename: "kick.wav" },
    { serverFilename: "./audio_files/hihat.wav", virtualFilename: "hihat.wav" },
    { serverFilename: "./audio_files/snare.wav", virtualFilename: "snare.wav" },
    { serverFilename: "./audio_files/clap.wav", virtualFilename: "clap.wav" },
    // Ensure these actually exist or remove them
    // { serverFilename: "./audio_files/snare.wav", virtualFilename: "vocals.wav" }
];
