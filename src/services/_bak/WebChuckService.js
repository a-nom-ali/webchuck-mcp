// src/services/webchuckService.js
import { toast } from 'react-hot-toast';
import { getClientConfig } from '../config';

class WebChuckService {
  constructor() {
    this.socket = null;
    this.sessionId = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.config = getClientConfig();
  }
  
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(`${this.config.wsBaseUrl}/ws`);
        
        this.socket.onopen = () => {
          this.isConnected = true;
          this._notifyListeners('connectionChange', true);
          resolve(true);
        };
        
        this.socket.onclose = () => {
          this.isConnected = false;
          this._notifyListeners('connectionChange', false);
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
        this.socket.onmessage = (event) => {
          this._handleIncomingMessage(event);
        };
      } catch (err) {
        console.error('Failed to connect:', err);
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
  }
  
  stopCode() {
    if (!this.isConnected) return;
    
    this._sendMessage({
      type: 'stopCode'
    });
  }
  
  setSessionName(name) {
    if (!this.isConnected || !this.sessionId) return;
    
    this._sendMessage({
      type: 'setSessionName',
      payload: { name }
    });
  }
  
  // Other methods like loadSamples, searchSamples, etc.
  
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
          
        // Handle other message types
          
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
      return;
    }
    
    this.socket.send(JSON.stringify(message));
  }
}

// Create a singleton instance
const webchuckService = new WebChuckService();
export default webchuckService;