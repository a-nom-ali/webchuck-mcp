import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import express from "express";
// import http from "http";
import cors from "cors";
import fs from "fs";
import path from "path";
import {Logger, LogLevel} from "../utils/logger.js";
import {AudioService} from "./audioService.js";
import {WebSocketHandler} from "./webSocketHandler.js";
import {ApiController} from "./apiController.js";
import {TransportManager} from "./transportManager.js";
import {McpServerConfig} from "./mcpServerConfig.js";
import {WebSocketServer} from "ws";
import { getServerConfig } from './config.js';
import https from "https";
import {SessionsManager} from "./sessionsManager.js";

export class Server {
    private mcpServer: McpServer;
    private wss:WebSocketServer;
    private audioService: AudioService;
    private webSocketHandler:WebSocketHandler;
    private apiController:ApiController;
    private mcpServerConfig:McpServerConfig;
    private transportManager:TransportManager;
    private logger: Logger;

    constructor(
        private sessionsManager: SessionsManager,
        private workingDirectory: string,
        private audioDirectory: string
    ) {
        this.logger = new Logger('WebChucK MCP Server', LogLevel.INFO);
        const config = getServerConfig(this.workingDirectory, this.audioDirectory);

        const app = express();

        // app.use(cors());
        // Configure CORS with the origins from config

        const credentials = {
            key: fs.readFileSync(`${this.workingDirectory}/openssl/key.pem`),
            cert: fs.readFileSync(`${this.workingDirectory}/openssl/cert.pem`)
        };

        app.use(cors());
        app.use(express.json({ limit: '50mb' }));
        app.use(express.raw({ type: '*/*', limit: '50mb' }));
        app.use(express.static(path.join(workingDirectory, 'public')));

        const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3030;
        const httpsServer = https.createServer(credentials, app);
        // const httpServer = http.createServer(app);

        this.wss = new WebSocketServer({
            server: httpsServer
        });

        this.mcpServer = new McpServer({
            name: 'WebChucK',
            version: '1.0.0'
        });

        this.audioService = new AudioService(
            this.audioDirectory,
            this.logger);

        this.webSocketHandler = new WebSocketHandler(
            this.wss,
            this.sessionsManager,
            this.audioService,
            this.logger,
            this.mcpServer);

        this.apiController = new ApiController(
            app,
            this.sessionsManager,
            this.webSocketHandler,
            this.audioService,
            this.logger,
            PORT,
            this.workingDirectory);

        this.mcpServerConfig = new McpServerConfig(
            this.mcpServer,
            this.sessionsManager,
            this.audioService,
            this.logger,
            PORT,
            this.workingDirectory);

        this.transportManager = new TransportManager(
            app,
            this.mcpServer,
            this.logger,
            PORT);

        httpsServer.listen(PORT, "0.0.0.0", () => this.logger.info(`Server running on port ${PORT}`));

        // Handle shutdown
        process.on('SIGINT', async () => {
            this.logger.info('Shutting down...');
            httpsServer.closeAllConnections();
            this.wss.close(err => {
                if (err) {
                    this.logger.error('Error closing websocket server', err);
                }
            });
            process.exit(0);
        });
    }
}
