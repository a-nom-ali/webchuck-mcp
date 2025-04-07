// src/services/webchuckService.js
import { toast } from 'react-hot-toast';

class WebChuckService {
  constructor() {
    this.socket = null;
    this.sessionId = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3030/ws';
  }
  
  connect() {
    return new Promise((resolve, reject) => {
      try {
        toast.loading('Connecting to WebChuck server...', { id: 'connect-toast' });
        
        this.socket = new WebSocket(this.wsUrl);
        
        this.socket.onopen = () => {
          this.isConnected = true;
          this._notifyListeners('connectionChange', true);
          toast.success('Connected to WebChuck server', { id: 'connect-toast' });
          resolve(true);
        };
        
        this.socket.onclose = () => {
          this.isConnected = false;
          this._notifyListeners('connectionChange', false);
          toast.error('Disconnected from WebChuck server', { id: 'disconnect-toast' });
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          toast.error('Failed to connect to WebChuck server', { id: 'connect-toast' });
          reject(error);
        };
        
        this.socket.onmessage = (event) => {
          this._handleIncomingMessage(event);
        };
      } catch (err) {
        console.error('Failed to connect:', err);
        toast.error(`Connection error: ${err.message}`, { id: 'connect-toast' });
        reject(err);
      }
    });
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.sessionId = null;
  }
  
  runCode(code) {
    if (!this.isConnected) {
      toast.error('Not connected to server');
      return;
    }
    
    this._sendMessage({
      type: 'runCode',
      payload: { code }
    });
    toast.success('Code execution started');
  }
  
  stopCode() {
    if (!this.isConnected) {
      toast.error('Not connected to server');
      return;
    }
    
    this._sendMessage({
      type: 'stopCode'
    });
    toast.success('Code execution stopped');
  }
  
  loadSamples(filePaths) {
    if (!this.isConnected) {
      toast.error('Not connected to server');
      return;
    }
    
    this._sendMessage({
      type: 'loadSamples',
      payload: { filePaths }
    });
  }
  
  preloadSampleFamily(family) {
    if (!this.isConnected) {
      toast.error('Not connected to server');
      return;
    }
    
    this._sendMessage({
      type: 'preloadSampleFamily',
      payload: { family }
    });
    toast.loading(`Loading ${family} samples...`, { id: 'preload-toast' });
  }
  
  setSessionName(name) {
    if (!this.isConnected || !this.sessionId) {
      toast.error('Not connected to server');
      return;
    }
    
    this._sendMessage({
      type: 'setSessionName',
      payload: { name }
    });
  }
  
  // Event handling
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    return () => this.removeEventListener(event, callback);
  }
  
  removeEventListener(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }
  
  _notifyListeners(event, data) {
    if (!this.listeners.has(event)) return;
    
    for (const callback of this.listeners.get(event)) {
      callback(data);
    }
  }
  
  _handleIncomingMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'sessionId':
          this.sessionId = message.payload.sessionId;
          this._notifyListeners('sessionChange', this.sessionId);
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
          toast.success(`${message.payload.family} samples loaded`, { id: 'preload-toast' });
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
  
  _sendMessage(message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Socket not connected');
      return false;
    }
    
    this.socket.send(JSON.stringify(message));
    return true;
  }
}

// Create a singleton instance
const webchuckService = new WebChuckService();
export default webchuckService;