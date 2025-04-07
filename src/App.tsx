// src/App.jsx
import React from 'react';
import { Toaster } from 'react-hot-toast';
import {WebChuckContextProvider as WebChuckProvider} from './contexts/WebChuckContextProvider.js';
import { ThemeProvider } from './contexts/ThemeContextProvider.js';
import Header from './components/Layout/Header.js';
import ConnectionPanel from './components/Connection/ConnectionPanel.js';
import CodeEditor from './components/Code/Editor/CodeEditor.js';
import Console from './components/Console/Console.js';
import SampleLibrary from './components/SamplesLibrary/SampleLibrary.js';
import Visualizer from './components/Visualizer/AudioVisualizer.js';
import LibraryManager from './components/Code/Library/LibraryManager.js';
import ExamplesSelector from './components/Code/Examples/ExamplesSelector.js';
import './App.css';

export function App() {
  return (
    <ThemeProvider>
      <WebChuckProvider>
        <div className="app-container">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#4caf50',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#f44336',
                  secondary: '#fff',
                },
              },
            }}
          />
          <Header />

          <main className="main-content">
            <div className="left-panel">
              <ConnectionPanel />
              <div className="editor-section">
                <div className="editor-tabs">
                  <ExamplesSelector />
                </div>
                <CodeEditor />
              </div>
              <Console />
            </div>

            <div className="right-panel">
              <SampleLibrary />
              <LibraryManager />
              <Visualizer />
            </div>
          </main>
        </div>
      </WebChuckProvider>
    </ThemeProvider>
  );
}

export default App;