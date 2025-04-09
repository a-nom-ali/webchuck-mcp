// apiController.ts
import {sessionsManager, SessionsManager} from "./sessionsManager.js";
import {AudioService} from "./audioService.js";
import {Logger} from "../utils/logger.js";
import express from "express";
import WebSocket from "ws";
import {v4 as uuidv4} from "uuid";
import path from "path";
import fs from "fs";
import {WebSocketHandler} from "./webSocketHandler.js";
import {EXCLUDED_SAMPLE_KEYWORDS} from "./config.js";
import {SamplesApiController} from "./API/samplesApiController.js";
import {SnippetApiController} from "./API/snippetApiController.js";
import {VolumeApiController} from "./API/volumeApiController.js";

export class ApiController {
    constructor(
        private app: express.Express,
        private sessionsManager: SessionsManager,
        private webSocketHandler: WebSocketHandler,
        private audioService: AudioService,
        private logger: Logger,
        private port: any,
        private working_directory: string
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
        // TODO: Tool Setup
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

        // this.app.use((req, res, next) => {
        //     if (req.url.includes("/audio/")){
        //         const trimmedPathParts = req.url.split(/\/audio\//);
        //
        //         // Pass the trimmed path as the filename parameter
        //         req.url = `${trimmedPathParts[0]}/audio`;
        //         req.params.filename = `${trimmedPathParts[1]}`;
        //     }
        //
        //     next(req);
        // });

        // ==== API: Download audio file ====
        this.app.get('/api/audio/:filename', (req, res) => {
            const filename = decodeURIComponent(req.params.filename);
            // Split the paths into arrays of directories
            const audioDirParts = this.audioService.audioDir.split(/\/|\\/);
            const pathParts = filename.split('/');

            // Remove empty strings from the array (in case of trailing slashes)
            const audioDirPartsCleaned = audioDirParts.filter(dir => dir !== '');
            const pathPartsCleaned = pathParts.filter(dir => dir !== '');

            // Merge the two arrays, removing any duplicate directories
            const mergedDirs = [...new Set([...audioDirPartsCleaned, ...pathPartsCleaned])];

            // Join the merged array back into a path
            const filepath = mergedDirs.join('/');

            if (!fs.existsSync(filepath)) {
                return res.status(404).json({error: `File not found: ${filepath}`});
            }

            res.sendFile(filepath);
        });

        // ==== API: List available audio files ====
        this.app.get('/api/search/keywords', (req, res) => {
            try {
                let audioKeywords: string[] = [];
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
                            const relativePath = path.relative(path.join(_this.working_directory, 'public'), fullPath).replace(/\\/g, "/");

                            // get path parts, drop the filename,filtering out the bits that are included in _this.working_directory
                            const relativePathParts = relativePath.split('/').slice(0, -1).filter(part => !_this.audioService.audioDir.includes(part) && !EXCLUDED_SAMPLE_KEYWORDS.includes(part));

                            audioKeywords = Array.from(new Set([...audioKeywords, ...relativePathParts]));
                        }
                    }
                }

                // Start scanning from the root audio directory
                this.logger.info(this.audioService.audioDir);
                scanDirectory(this.audioService.audioDir);

                // Return the list of keywords ordered alphabetically
                return res.status(200).json({keywords: audioKeywords.sort()});
            } catch (err) {
                this.logger.error('Error listing audio files:', err);
                return res.status(500).json({error: 'Internal server error'});
            }
        });

        // ==== API: List available audio files ====
        this.app.get('/api/audio', (req, res) => {
            try {
                // Get the search query from the request, converting to lowercase, and splitting by spaces and underscores
                const searchQueryWords = (req.query.q ? (req.query.q as string).toLowerCase() : '').split(/[ _]/g);

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
                            const relativePath = path.relative(path.join(_this.working_directory, 'public'), fullPath).replace(/\\/g, "/");

                            // Apply search filter if provided
                            if (!searchQueryWords || searchQueryWords.every(word => relativePath.toLowerCase().includes(word))) {
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

                const response = await fetch(`http://localhost:${this.port}/api/debug/preload`);

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
                cwd: this.working_directory,
            };
            res.status(200).json(sessionInfo);
        });

        this.app.get('/api/debug/execution/:sessionId?', (req, res) => {
            const {sessionId} = req.params;

            // If sessionId is provided, get specific session's execution errors
            if (sessionId) {
                const session = this.sessionsManager.get(sessionId);
                if (!session) {
                    return res.status(404).json({error: `Session not found: ${sessionId}`});
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
            const {sessionId} = req.params;

            // If sessionId is provided, get specific session's preload results
            if (sessionId) {
                const session = this.sessionsManager.get(sessionId);
                if (!session) {
                    return res.status(404).json({error: `Session not found: ${sessionId}`});
                }

                const preloadInfo = session.debugInfo.lastPreloadResult && session.debugInfo.lastPreloadResult.toString() !== "" && session.debugInfo.lastPreloadResult.toString() !== "undefined"
                    ? session.debugInfo.lastPreloadResult
                    : "No preload errors detected for this session.";
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

        /**
         * API Endpoint to get directory contents from GitHub.
         * Example URL: /api/repo-content/octocat/Spoon-Knife/recipes?ref=main
         * :owner - Repository owner (e.g., 'octocat')
         * :repo - Repository name (e.g., 'Spoon-Knife')
         * * (splat) - Directory path within the repo (e.g., 'recipes' or 'src/components')
         * ?ref=branch_name - Optional query parameter for branch/tag/commit (defaults to main)
         */
        this.app.get('/api/repo-content/:owner/:repo/*', async (req:any, res:any) => {
            const {owner, repo} = req.params;
            const dirPath = req.params[0] || '';
            const ref = req.query.ref || 'main'; // Default branch

            const githubToken = process.env.GITHUB_TOKEN;
            if (!githubToken) {
                console.error('GitHub token not found in environment variables.');
                return res.status(500).json({error: 'Server configuration error: GitHub token missing.'});
            }

            // Construct the URL with query parameters manually for fetch
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}`;
            const urlWithParams = new URL(apiUrl);
            urlWithParams.searchParams.append('ref', ref);

            console.log(`Workspaceing: ${urlWithParams.toString()}`);

            try {
                const response = await fetch(urlWithParams.toString(), {
                    method: 'GET', // Explicitly set method (optional for GET)
                    headers: {
                        'Authorization': `Bearer ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
                });

                // fetch only throws on network errors, check response.ok for HTTP errors (4xx/5xx)
                if (!response.ok) {
                    let errorBody;
                    try {
                        // Try to parse the error body as JSON, fallback to text
                        errorBody = await response.json();
                    } catch (e) {
                        errorBody = await response.text(); // Get raw text if not JSON
                    }
                    console.error(`GitHub API Error ${response.status}:`, errorBody);

                    // Throw an error to be caught by the catch block
                    const error = new Error(`GitHub API Error (${response.status})`) as Error & { status: number; body: any };
                    error.status = response.status; // Add status to the error object
                    error.body = errorBody; // Add response body to the error object
                    throw error;
                }

                // If response.ok is true, parse the JSON body
                const data = await response.json();

                // Filter and map the data (same logic as before, using 'data' directly)
                const files = data
                    .filter((item: { type: string }) => item.type === 'file')
                    .map((item: { name: string, path: string, sha: string, size: number, download_url: string | null }) => ({
                        name: item.name,
                        path: item.path,
                        sha: item.sha,
                        size: item.size,
                        download_url: item.download_url // May still be null
                    }));

                res.json(files);

            } catch (error: any) {
                // Check if it's the custom error we threw with status
                const status = error.status || 500; // Use status from error, or default to 500
                const message = error.body?.message || error.message || 'Failed to fetch repository content.'; // Prefer message from GitHub error body

                console.error('Error fetching GitHub content:', error); // Log the full error

                // Provide more specific feedback based on status
                if (status === 404) {
                    return res.status(404).json({error: `Repository or path not found. Details: ${message}`});
                }
                if (status === 401 || status === 403) {
                    return res.status(status).json({error: `Authentication or Permission error. Check your token and its permissions. Details: ${message}`});
                }

                // General error for other cases
                res.status(status).json({error: `GitHub API Error: ${message}`});
            }
        });

        // Add other endpoints...

        const sampleApiController = new SamplesApiController(this.app, sessionsManager, this.webSocketHandler, this.audioService, this.logger, this.port, this.working_directory);
        const snippetApiController = new SnippetApiController(this.app, sessionsManager, this.webSocketHandler, this.audioService, this.logger, this.port, this.working_directory);
        const volumeApiController = new VolumeApiController(this.app, sessionsManager, this.webSocketHandler, this.audioService, this.logger, this.port, this.working_directory);

    }
}