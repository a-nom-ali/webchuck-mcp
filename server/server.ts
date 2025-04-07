import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import express from "express";
import http from "http";
import cors from "cors";
import fs from "fs";
import path from "path";
import {Logger, LogLevel} from "../utils/logger.js";
import {sessionsManager} from "./sessionsManager.js";
import {AudioService} from "./audioService.js";
import {WebSocketHandler} from "./webSocketHandler.js";
import {ApiController} from "./apiController.js";
import {TransportManager} from "./transportManager.js";
import {McpServerConfig} from "./mcpServerConfig.js";
import {WebSocketServer} from "ws";
import { getServerConfig } from './config.js';

export function server (workingDirectory: string, audioDirectory: string) {
    const logger = new Logger('WebChucK MCP Server', LogLevel.INFO, workingDirectory);
    const config = getServerConfig(workingDirectory, audioDirectory);

    const app = express();

    // app.use(cors());
    // Configure CORS with the origins from config

    app.use(cors({
        origin: config.corsOrigins,
        credentials: true
    }));
    app.use(express.json({limit: '50mb'}));
    app.use(express.raw({type: '*/*', limit: '50mb'}));

    // Serve static files from Vite build output
    app.use(express.static(path.join(workingDirectory, 'dist')));

    const PORT = process.env.PORT || 3030;
    const httpServer = http.createServer(app);
    const wss = new WebSocketServer({server: httpServer});
    const mcpServer = new McpServer({name: 'WebChucK', version: '1.0.0'});
    const audioService = new AudioService(audioDirectory, logger);
    const webSocketHandler = new WebSocketHandler(wss, sessionsManager, audioService, logger, mcpServer);
    const apiController = new ApiController(app, sessionsManager, webSocketHandler, audioService, logger, config);
    const mcpServerConfig = new McpServerConfig(mcpServer, sessionsManager, audioService, logger, config);
    const transportManager = new TransportManager(app, mcpServer, logger);

    httpServer.listen(config.port, () => logger.info(`Server running on port ${config.port}`));

    // Add a fallback route for SPA routing
    app.get('*', (req, res, next) => {
        // Skip API and WebSocket routes
        if (req.path.startsWith('/message') || req.path.startsWith('/sse') || req.path.startsWith('/api') || req.path.startsWith('/ws')) {
            return next();
        }
        res.sendFile(path.join(workingDirectory, 'dist', 'index.html'));
    });

    // Handle shutdown
    process.on('SIGINT', async () => {
        logger.info('Shutting down...');
        httpServer.closeAllConnections();
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

}