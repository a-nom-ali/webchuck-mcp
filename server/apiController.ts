// apiController.ts
import {SessionsManager} from "./sessionsManager.js";
import {AudioService} from "./audioService.js";
import {Logger} from "../utils/logger.js";
import express from "express";
import WebSocket from "ws";
import {v4 as uuidv4} from "uuid";
import path from "path";
import fs from "fs";
import {WebSocketHandler} from "./webSocketHandler.js";
import {ServerConfig} from "./config.js";

export class ApiController {
    constructor(
        private app: express.Express,
        private sessionsManager: SessionsManager,
        private webSocketHandler: WebSocketHandler,
        private audioService: AudioService,
        private logger: Logger,
        private config: ServerConfig
    ) {
        this.setupRoutes();
    }

    private setupRoutes(): void {
// ==== API: Execute ChucK code ====
        this.app.post('/api/execute', async (req, res) => {
            try {
                const {code, sessionId} = req.body;

                if (!code) {
                    return res.status(400).json({error: 'No ChucK code provided'});
                }

                const session = this.sessionsManager.get(sessionId);
                if (!session) {
                    return res.status(404).json({error: 'Session not found'});
                }

                if (session.ws.readyState !== WebSocket.OPEN) {
                    return res.status(400).json({error: 'WebChucK client not connected'});
                }

                // Store the active code
                session.activeCode = code;
                session.status = 'executing';

                // Send code to WebChucK client
                session.ws.send(JSON.stringify({
                    type: 'execute_code',
                    code: code
                }));

                return res.status(200).json({
                    message: 'Code execution started',
                    sessionId: sessionId
                });

            } catch (err) {
                this.logger.error('Error executing ChucK code:', err);
                return res.status(500).json({error: 'Internal server error'});
            }
        });

// ==== API: Stop ChucK execution ====
        this.app.post('/api/stop', async (req, res) => {
            try {
                const {sessionId} = req.body;

                const session = this.sessionsManager.get(sessionId);
                if (!session) {
                    return res.status(404).json({error: 'Session not found'});
                }

                if (session.ws.readyState !== WebSocket.OPEN) {
                    return res.status(400).json({error: 'WebChucK client not connected'});
                }

                // Send stop command to WebChucK client
                session.ws.send(JSON.stringify({
                    type: 'stop_execution'
                }));

                session.status = 'idle';

                return res.status(200).json({
                    message: 'Execution stopped',
                    sessionId
                });

            } catch (err) {
                this.logger.error('Error stopping ChucK execution:', err);
                return res.status(500).json({error: 'Internal server error'});
            }
        });

// ==== API: Get session status ====
        this.app.get('/api/status/:sessionId', (req, res) => {
            const {sessionId} = req.params;

            const session = this.sessionsManager.get(sessionId);
            if (!session) {
                return res.status(404).json({error: 'Session not found'});
            }

            return res.status(200).json({
                sessionId,
                status: session.status,
                connected: session.ws.readyState === WebSocket.OPEN
            });
        });

// ==== API: Upload audio file ====
        this.app.post('/api/upload', (req, res) => {
            try {
                const fileId = uuidv4();
                const filename = req.headers['x-filename'] as string || `${fileId}.wav`;
                const filepath = path.join(this.audioService.audioDir, filename);

                fs.writeFileSync(filepath, req.body);

                return res.status(200).json({
                    message: 'File uploaded successfully',
                    fileId,
                    filename,
                    filepath
                });
            } catch (err) {
                this.logger.error('Error uploading file:', err);
                return res.status(500).json({error: 'Internal server error'});
            }
        });

// ==== API: Download audio file ====
        this.app.get('/api/audio/:filename', (req, res) => {
            const {filename} = req.params;
            const filepath = path.join(this.audioService.audioDir, filename);

            if (!fs.existsSync(filepath)) {
                return res.status(404).json({error: 'File not found'});
            }

            res.sendFile(filepath);
        });

// ==== API: List available audio files ====
        this.app.get('/api/audio', (req, res) => {
            try {
                // Get the search query from the request
                const searchQuery = req.query.q ? (req.query.q as string).toLowerCase() : '';

                let audioFiles: string[] = [];
                const _this = this;

                // Function to recursively scan directories
                function scanDirectory(dir: string) {
                    const entries = fs.readdirSync(dir, {withFileTypes: true});

                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);

                        if (entry.isDirectory()) {
                            // Recursively scan subdirectories
                            scanDirectory(fullPath);
                        } else if (entry.isFile() &&
                            (entry.name.endsWith('.wav') || entry.name.endsWith('.aiff'))) {
                            // Add audio files to the list with relative path from this.audioService.audioDir
                            const relativePath = path.relative(path.join(_this.config.workingDirectory, 'public'), fullPath);

                            // Apply search filter if provided
                            if (!searchQuery || relativePath.toLowerCase().includes(searchQuery)) {
                                audioFiles.push(relativePath);
                            }
                        }
                    }
                }

                // Start scanning from the root audio directory
                this.logger.info(this.audioService.audioDir);
                scanDirectory(this.audioService.audioDir);

                return res.status(200).json({files: audioFiles});
            } catch (err) {
                this.logger.error('Error listing audio files:', err);
                return res.status(500).json({error: 'Internal server error'});
            }
        });

// ==== API: Preload samples ====
        this.app.post('/api/preload', async (req, res) => {
            try {
                const {samples, sessionId} = req.body;

                if (!samples || !Array.isArray(samples)) {
                    return res.status(400).json({error: 'No samples list provided or invalid format'});
                }

                const session = this.sessionsManager.get(sessionId);
                if (!session) {
                    return res.status(404).json({error: 'Session not found'});
                }

                if (session.ws.readyState !== WebSocket.OPEN) {
                    return res.status(400).json({error: 'WebChucK client not connected'});
                }

                this.webSocketHandler.clear_preload_response(sessionId);
                // Send preload request to WebChucK client
                session.ws.send(JSON.stringify({
                    type: 'preload_samples',
                    samples: samples
                }));

                const response = await fetch(`${this.config.publicUrl}/api/debug/preload`);

                const data = await response.json();
                return res.status(200).json({
                    message: data.error,
                    sessionId: sessionId
                });

            } catch (err) {
                this.logger.error('Error sending preload request:', err);
                return res.status(500).json({error: 'Internal server error'});
            }
        });

        this.app.get('/api/debug/sessions', (req, res) => {
            // Create array of session info with ids and names
            const sessions = Array.from(this.sessionsManager.entries()).map(([id, session]) => ({
                id,
                name: session.name || 'Unnamed Session',
                status: session.status || 'unknown',
                connected: session.ws.readyState === WebSocket.OPEN
            }));

            const sessionInfo = {
                size: this.sessionsManager.size,
                sessions: sessions,
                cwd: this.config.workingDirectory,
            };
            res.status(200).json(sessionInfo);
        });

        this.app.get('/api/debug/execution/:sessionId?', (req, res) => {
            const { sessionId } = req.params;

            // If sessionId is provided, get specific session's execution errors
            if (sessionId) {
                const session = this.sessionsManager.get(sessionId);
                if (!session) {
                    return res.status(404).json({ error: `Session not found: ${sessionId}` });
                }

                const errorInfo = session.debugInfo.lastExecutionError || "No errors detected for this session.";
                session.debugInfo.lastExecutionError = "";
                this.logger.info(`Retrieved execution debug info for session ${sessionId}:`, errorInfo);

                return res.status(200).json({
                    sessionId,
                    name: session.name || 'Unnamed Session',
                    error: errorInfo
                });
            }

            // If no sessionId, fallback to global execution error response
            // this.logger.info(execution_error_response || "No errors detected. Seems fine.")
            this.logger.info("No errors detected. Seems fine.")
            res.status(200).json({
                // error: execution_error_response || "No errors detected. Seems fine."
                error: "No errors detected. Seems fine."
            });

        });

        this.app.get('/api/debug/preload/:sessionId?', (req, res) => {
            const { sessionId } = req.params;

            // If sessionId is provided, get specific session's preload results
            if (sessionId) {
                const session = this.sessionsManager.get(sessionId);
                if (!session) {
                    return res.status(404).json({ error: `Session not found: ${sessionId}` });
                }

                const preloadInfo = session.debugInfo.lastPreloadResult || "No preload results for this session.";
                session.debugInfo.lastPreloadResult = "";
                this.logger.info(`Retrieved preload debug info for session ${sessionId}:`, preloadInfo);

                return res.status(200).json({
                    sessionId,
                    name: session.name || 'Unnamed Session',
                    preloadResult: preloadInfo
                });
            }

            // If no sessionId, fallback to global preload response
            // this.logger.info(preload_response || "No errors detected. Seems fine.")
            this.logger.info("No errors detected. Seems fine.")
            res.status(200).json({
                // error: preload_response || "No errors detected. Seems fine."
                error: "No errors detected. Seems fine."
            });
        });

        // Add other endpoints...
    }
}