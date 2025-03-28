# WebChucK MCP Server

A server that integrates WebChucK (a browser-based version of ChucK audio programming language) with the Model Context Protocol (MCP) for AI-assisted audio synthesis and sound design.

## Overview

This server provides:
- WebSocket connections for WebChucK browser clients
- MCP tools for AI assistants to interact with WebChucK
- Express API endpoints for direct interaction

## Project Structure

- `index.ts` - Main entry point for the server
- `sessions.ts` - Session management singleton
- `webchuck-routes.ts` - Express routes for WebChucK API
- `mcp-tools.ts` - MCP tools and resources
- `public/` - Static files (including the WebChucK client)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm run dev
```

3. Access the WebChucK client at:
```
http://localhost:3030/
```

4. Connect AI assistant to:
```
http://localhost:3030/sse
```

## Usage

### Browser Client

1. Open the WebChucK client in your browser
2. Click "Connect to WebChucK" 
3. Click "Connect to Server"
4. Use the code editor to write and execute ChucK code

### AI Assistant (Claude)

Configure Claude Desktop to use the SSE endpoint:

```json
{
  "webchuck_mcp": {
    "command": "npx",
    "args": [
      "tsx",
      "path/to/index.ts"
    ],
    "env": {
      "DEBUG": "true"
    }
  }
}
```

Then use the MCP tools in Claude:
- `executeChucK`: Execute ChucK code
- `stopChucK`: Stop ChucK execution
- `getChucKSessions`: List active sessions
- `listAudioFiles`: List available audio files

## API Endpoints

- `POST /api/execute` - Execute ChucK code
- `POST /api/stop` - Stop ChucK execution
- `GET /api/status/:sessionId` - Get session status
- `GET /api/audio` - List audio files
- `GET /api/audio/:filename` - Download audio file
- `POST /api/upload` - Upload audio file
- `GET /api/debug/sessions` - Debug session information

## ChucK Resources

- Audio resources: `audio://{filename}`
- Example code: `chuck-example://{category}/{name}`

## License

MIT