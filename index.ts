import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {SSEServerTransport} from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import {WebSocketServer} from "ws"; // Corrected import
import http from "http";
import https from "https";
import cors from "cors";
import fs from "fs";
import path from "path";
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKING_DIRECTORY = process.env.WORKING_DIRECTORY || __dirname;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
process.env.LOGGING_FILE = 'true';

import {Logger, LogLevel} from "./utils/logger.js";
import {sessionsManager} from "./server/sessionsManager.js";
import {AudioService} from "./server/audioService.js";
import {WebSocketHandler} from "./server/webSocketHandler.js";
import {ApiController} from "./server/apiController.js";
import {TransportManager} from "./server/transportManager.js";
import {McpServerConfig} from "./server/mcpServerConfig.js";

// Create directory for audio files if it doesn't exist
const AUDIO_DIR = path.join(WORKING_DIRECTORY, 'public/audio_files/Waves');
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, {recursive: true});
}

// main.ts
const logger = new Logger('WebChucK MCP Server', LogLevel.INFO);
const app = express();

const credentials = {
  key: fs.readFileSync(`${WORKING_DIRECTORY}/openssl/key.pem`),
  cert: fs.readFileSync(`${WORKING_DIRECTORY}/openssl/cert.pem`)
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: '*/*', limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3030;
const httpsServer = https.createServer(credentials, app);
// const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpsServer });
const mcpServer = new McpServer({ name: 'WebChucK', version: '1.0.0' });
const audioService = new AudioService(AUDIO_DIR, logger);
const webSocketHandler = new WebSocketHandler(wss, sessionsManager, audioService, logger, mcpServer);
const apiController = new ApiController(app, sessionsManager, webSocketHandler, audioService, logger, PORT, WORKING_DIRECTORY);
const mcpServerConfig = new McpServerConfig(mcpServer, sessionsManager, audioService, logger, PORT, WORKING_DIRECTORY);
const transportManager = new TransportManager(app, mcpServer, logger, PORT);

httpsServer.listen(PORT, "0.0.0.0", () => logger.info(`Server running on port ${PORT}`));

// Handle shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    httpsServer.closeAllConnections();
    wss.close(err => {
        if (err) {
            logger.error('Error closing websocket server', err);
        }
    });
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason);
});
