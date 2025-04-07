# WebChucK MCP Developer Guide

This guide provides an overview of the WebChucK MCP codebase and explains how to extend or modify the system. It's intended for developers who want to understand the architecture or contribute to the project.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Code Structure](#code-structure)
3. [Server-Side Components](#server-side-components)
4. [Client-Side Components](#client-side-components)
5. [WebChucK Integration](#webchuck-integration)
6. [MCP Integration](#mcp-integration)
7. [UI Components](#ui-components)
8. [Advanced Features](#advanced-features)
9. [Testing](#testing)
10. [Contributing Guidelines](#contributing-guidelines)

## Architecture Overview

WebChucK MCP uses a client-server architecture:

- **Server Side**: A Node.js server using Express and WebSockets to manage sessions and serve resources
- **Client Side**: A browser-based frontend that connects to the WebChucK engine and server
- **MCP Integration**: Model Context Protocol implementation for AI assistant integration

The system enables AI assistants to control WebChucK through standardized interfaces while providing human-friendly UI components for interaction and visualization.

## Code Structure

The codebase is organized as follows:

```
webchuck_mcp/
├── index.ts                   # Main server file with MCP implementation
├── public/                    # Client-side files
│   ├── js/                    # JavaScript modules
│   │   ├── main.js            # Main client initialization
│   │   ├── ui.js              # UI management
│   │   ├── serverConnection.js # WebSocket handling
│   │   ├── webchuckService.js # WebChucK integration
│   │   ├── audioRecorder.js   # Audio recording
│   │   ├── libraryService.js  # Code library management
│   │   ├── parameterControl.js # Parameter extraction and control
│   │   ├── audioVisualizer.js # Audio visualization
│   │   └── config.js          # Configuration constants
│   ├── webchuck/              # WebChucK engine files
│   ├── style.css              # CSS styles with themes
│   └── index.html             # Main HTML structure
├── utils/                     # Server utilities
│   └── logger.js              # Logging utility
└── docs/                      # Documentation
```

## Server-Side Components

### Main Server (index.ts)

The main server file implements both the web server and the MCP server:

- **Express App**: Serves static files and API endpoints
- **WebSocket Server**: Manages real-time communication with clients
- **MCP Server**: Implements the Model Context Protocol for AI integration
- **Session Management**: Tracks WebChucK sessions and their state

Key components:

- `McpServer`: Initializes the MCP protocol handler
- `SessionsManager`: Singleton for managing client sessions
- `WebSocketServer`: Manages WebChucK client connections
- API endpoints for executing code, managing files, etc.

### Session Management

The `SessionsManager` class maintains session state including:

- Active WebSocket connections
- Current code being executed
- Session names and identification
- Debugging information

This allows the system to track multiple concurrent sessions and their state.

### MCP Tools Implementation

The server implements several MCP tools:

- `executeChucK`: Runs ChucK code in a session
- `stopChucK`: Stops code execution
- `getCodeFromEditor`: Retrieves the current code from a session
- `listAudioFiles`: Lists available audio files
- `preloadSamples`: Preloads audio files for samples
- Other utility tools for debugging and management

## Client-Side Components

### Main Client (main.js)

The main client script initializes the application and coordinates all components:

- Sets up event listeners
- Manages the connection flow
- Coordinates component interactions
- Handles UI state management
- Initializes advanced features like visualizers

### WebChucK Service (webchuckService.js)

This module handles interaction with the WebChucK engine:

- Initializes the WebChucK VM
- Manages code execution
- Handles audio context setup
- Manages file preloading
- Provides API for parameter updating

### Server Connection (serverConnection.js)

Manages WebSocket communication with the server:

- Establishes and maintains the connection
- Handles message sending and receiving
- Manages session state
- Provides API for server interactions

### UI Management (ui.js)

Handles all UI-related functionality:

- DOM element access and updates
- Event handling
- State visualization
- Theme management

### Library Service (libraryService.js)

Manages code snippets and persistence:

- Saves code to localStorage
- Loads saved snippets
- Manages snippet metadata
- Provides search and filtering

## WebChucK Integration

WebChucK MCP integrates with the WebChucK engine through the WebChucK API:

### Initialization

```javascript
theChuck = await Chuck.init(initialFiles, undefined, undefined, WEBCHUCK_DIR);
```

### Code Execution

```javascript
const shredId = await theChuck.runCode(code);
```

### Parameter Control

```javascript
await theChuck.setFloat(name, value);
await theChuck.setInt(name, Math.round(value));
```

### Audio Routing

The system creates an analyzer node for visualizations:

```javascript
analyser = audioContext.createAnalyser();
outputNode.connect(analyser);
analyser.connect(audioContext.destination);
```

## MCP Integration

### Server-Side Integration

The MCP integration is implemented in index.ts using the `@modelcontextprotocol/sdk`:

```typescript
const mcpServer = new McpServer({
    name: "WebChucK",
    version: "1.0.0"
});

mcpServer.tool("executeChucK", /* ... */);
```

### Tool Implementation

Each MCP tool follows this pattern:

```typescript
mcpServer.tool(
  "toolName",
  "Tool description",
  { /* parameter schema */ },
  async (params) => {
    // Implementation
    return {
      content: [{ type: "text", text: "Result message" }]
    };
  }
);
```

## UI Components

### Parameter Controls

The parameter control system:

1. Parses ChucK code for annotations
2. Extracts parameter information (name, type, range)
3. Creates UI controls dynamically
4. Connects controls to WebChucK variables

Implementation in parameterControl.js:

```javascript
const parameters = extractParameters(code);
createControls(parameters);
```

### Audio Visualizers

Three visualizer types are implemented:

1. **Waveform**: Uses `getByteTimeDomainData` for time-domain visualization
2. **Spectrum**: Uses `getByteFrequencyData` for frequency analysis
3. **Level Meter**: Calculates average amplitude

The visualizers update in real-time through an animation loop:

```javascript
function animationLoop() {
  drawVisualizations();
  animationFrame = requestAnimationFrame(animationLoop);
}
```

### Theming System

The theming system uses CSS variables and localStorage:

```javascript
function applyTheme(isDark) {
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}
```

## Advanced Features

### Parameter Annotation Syntax

Parameter controls are created based on code annotations:

```chuck
// @param float values between 0 and 1
// @range 0.1 1.0
float gain = 0.5;
```

The annotation syntax:
- `@param` marks the variable as controllable
- `@range min max` sets the control range

### WebChucK API Extensions

The system extends the WebChucK API with additional functionality:

```javascript
Chuck.prototype.chuckPrint = function (...args) {
  const message = args.join(' ');
  capturedMessages.push({ type: 'log', message });
  originalChuckPrint.apply(this, args);
};
```

## Testing

For testing the system, you can:

1. Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to test MCP functionality
2. Run unit tests with `npm test` (if implemented)
3. Test WebChucK integration using the example code snippets

## Contributing Guidelines

When contributing to this project:

1. Follow the existing code structure and patterns
2. Add proper documentation for new features
3. Use modular design to keep components separate
4. Test your changes thoroughly
5. Update documentation to reflect changes

For more details on contributing, see [CONTRIBUTING.md](../CONTRIBUTING.md).
