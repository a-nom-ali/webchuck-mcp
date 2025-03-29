import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {SSEServerTransport} from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import WebSocket, {WebSocketServer} from "ws"; // Corrected import
import http from "http";
import cors from "cors";
import {z} from "zod";
import fs from "fs";
import path from "path";
import {fileURLToPath} from 'url';
import {v4 as uuidv4} from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.LOGGING_FILE = 'true';
import {Logger, LogLevel} from "./utils/logger.js";

const WORKING_DIRECTORY = process.env.WORKING_DIRECTORY || __dirname;

// Setup logger
const logger = new Logger('WebChucK MCP Server', LogLevel.INFO);

// Create a singleton for sessions management
export class SessionsManager {
    private static instance: SessionsManager;
    private sessionsMap = new Map<string, any>();

    private constructor() {
    }

    public static getInstance(): SessionsManager {
        if (!SessionsManager.instance) {
            SessionsManager.instance = new SessionsManager();
        }
        return SessionsManager.instance;
    }

    public get(id: string) {
        return this.sessionsMap.get(id);
    }

    public set(id: string, data: any) {
        this.sessionsMap.set(id, data);
    }

    public delete(id: string) {
        return this.sessionsMap.delete(id);
    }

    public has(id: string) {
        return this.sessionsMap.has(id);
    }

    public get size() {
        return this.sessionsMap.size;
    }

    public entries() {
        return this.sessionsMap.entries();
    }

    public keys() {
        return this.sessionsMap.keys();
    }
}

// Then use it throughout your code
const sessionsManager = SessionsManager.getInstance();

// Create directory for audio files if it doesn't exist
const AUDIO_DIR = path.join(WORKING_DIRECTORY, 'public/audio_files/Waves/FluidR3_GM');
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, {recursive: true});
}

// Create Express app
const app = express();
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.raw({type: '*/*', limit: '50mb'}));

const PORT = process.env.PORT || 3030;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({server}); // Corrected instantiation

let execution_error_response = "";
let preload_response = "";
// Use STDIO transport by default
const transport = new StdioServerTransport();
// ==== Create MCP Server ====
const mcpServer = new McpServer({
    name: "WebChucK",
    version: "1.0.0"
});

// Store audio outputs
const audioOutputs = new Map<string, Buffer[]>();

// ==== WebSocket Connection Handler ====
wss.on('connection', (ws) => {
    const sessionId = uuidv4();
    const session = {ws, status: 'idle', activeCode: null};
    logger.info(`New WebChucK client connected: ${sessionId}`);

    sessionsManager.set(sessionId, session);

    // Send session ID to client
    ws.send(JSON.stringify({
        type: 'session_created',
        sessionId
    }));

    // Handle messages from WebChucK client
    ws.on('message', (message: WebSocket.Data) => {
        try {
            const data = JSON.parse(message.toString());

            switch (data.type) {
                case 'status_update':
                    handleStatusUpdate(sessionId, data);
                    break;
                case 'audio_data':
                    handleAudioData(sessionId, data);
                    break;
                case 'preload_complete':
                    handlePreloadComplete(sessionId, data);
                    break;
                case 'preload_error':
                    handleExecuteCodeError(sessionId, data);
                    break;
                case 'execute_code_error':
                    handleExecuteCodeError(sessionId, data);
                    break;
                case 'error':
                    logger.error(`Error from WebChucK client ${sessionId}:`, data.message);
                    break;
                default:
                    logger.info(`Unknown message type from WebChucK client: ${data.type}`);
            }
        } catch (err) {
            logger.error('Error processing WebSocket message:', err);
        }
    });

    // Handle WebSocket close
    ws.on('close', () => {
        logger.info(`WebChucK client disconnected: ${sessionId}`);
        sessionsManager.delete(sessionId);
        if (audioOutputs.has(sessionId)) {
            audioOutputs.delete(sessionId);
        }
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
        logger.error(`WebSocket error for session ${sessionId}:`, error);
    });
});

// ==== WebChucK Status Update Handler ====
function handleStatusUpdate(sessionId: string, data: any) {
    const session = sessionsManager.get(sessionId);
    // if (!session) return;

    session.status = data.status;
    logger.info(`Session ${sessionId} status updated to: ${data.status}`);
}

// ==== WebChucK Preload Complete Handler ====
function handlePreloadComplete(sessionId: string, data: any) {
    const session = sessionsManager.get(sessionId);
    // if (!session) return;

    logger.info(`Session ${sessionId} preload complete: ${data.status}`);

    mcpServer.server.notification({
        method: 'message',
        params: {
            message: data.message,
            sessionId: sessionId
        }
    })

    preload_response = data.message;
}

// ==== WebChucK Execute Code Error Handler ====
function handleExecuteCodeError(sessionId: string, data: any) {
    const session = sessionsManager.get(sessionId);
    // if (!session) return;

    logger.info(`Session ${sessionId} execution error updated to: ${data.status}`);
    mcpServer.server.notification({
        method: 'error',
        params: {
            message: data.message,
            sessionId: sessionId
        }
    })

    execution_error_response += data.error;
}

// ==== WebChucK Execute Code Error Handler ====
function handlePreloadError(sessionId: string, data: any) {
    const session = sessionsManager.get(sessionId);
    // if (!session) return;

    logger.info(`Session ${sessionId} preload error updated to: ${data.status}`);
    mcpServer.server.notification({
        method: 'error',
        params: {
            message: data.message,
            sessionId: sessionId
        }
    })

    preload_response = data.error;
}

// ==== WebChucK Audio Data Handler ====
function handleAudioData(sessionId: string, data: any) {
    if (!audioOutputs.has(sessionId)) {
        audioOutputs.set(sessionId, []);
    }

    // Store audio chunks
    const chunks = audioOutputs.get(sessionId)!;
    chunks.push(Buffer.from(data.buffer, 'base64'));

    // If this is the final chunk, save to file
    if (data.final) {
        saveAudioFile(sessionId);
    }
}

// ==== Save Audio File ====
function saveAudioFile(sessionId: string) {
    if (!audioOutputs.has(sessionId)) return;

    const chunks = audioOutputs.get(sessionId)!;
    const filename = `${sessionId}-${Date.now()}.wav`;
    const filepath = path.join(AUDIO_DIR, filename);

    // Combine chunks and write to file
    const audioBuffer = Buffer.concat(chunks);
    fs.writeFileSync(filepath, audioBuffer);

    logger.info(`Audio saved to: ${filepath}`);

    // Clear the stored chunks
    audioOutputs.set(sessionId, []);

    // Notify the client
    const session = sessionsManager.get(sessionId);
    if (session && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
            type: 'audio_saved',
            filename,
            filepath
        }));
    }
}

// ==== Express Endpoints ====

// ==== API: Execute ChucK code ====
app.post('/api/execute', async (req, res) => {
    try {
        const {code, sessionId} = req.body;

        if (!code) {
            return res.status(400).json({error: 'No ChucK code provided'});
        }

        const session = sessionsManager.get(sessionId);
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
        logger.error('Error executing ChucK code:', err);
        return res.status(500).json({error: 'Internal server error'});
    }
});

// ==== API: Stop ChucK execution ====
app.post('/api/stop', async (req, res) => {
    try {
        const {sessionId} = req.body;

        const session = sessionsManager.get(sessionId);
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
        logger.error('Error stopping ChucK execution:', err);
        return res.status(500).json({error: 'Internal server error'});
    }
});

// ==== API: Get session status ====
app.get('/api/status/:sessionId', (req, res) => {
    const {sessionId} = req.params;

    const session = sessionsManager.get(sessionId);
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
app.post('/api/upload', (req, res) => {
    try {
        const fileId = uuidv4();
        const filename = req.headers['x-filename'] as string || `${fileId}.wav`;
        const filepath = path.join(AUDIO_DIR, filename);

        fs.writeFileSync(filepath, req.body);

        return res.status(200).json({
            message: 'File uploaded successfully',
            fileId,
            filename,
            filepath
        });
    } catch (err) {
        logger.error('Error uploading file:', err);
        return res.status(500).json({error: 'Internal server error'});
    }
});

// ==== API: Download audio file ====
app.get('/api/audio/:filename', (req, res) => {
    const {filename} = req.params;
    const filepath = path.join(AUDIO_DIR, filename);

    if (!fs.existsSync(filepath)) {
        return res.status(404).json({error: 'File not found'});
    }

    res.sendFile(filepath);
});

// ==== API: List available audio files ====
app.get('/api/audio', (req, res) => {
    try {
        let audioFiles: string[] = [];

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
                    // Add audio files to the list with relative path from AUDIO_DIR
                    const relativePath = path.relative(path.join(WORKING_DIRECTORY, 'public'), fullPath);
                    audioFiles.push(relativePath);
                }
            }
        }

        // Start scanning from the root audio directory
        logger.info(AUDIO_DIR);
        scanDirectory(AUDIO_DIR);

        return res.status(200).json({files: audioFiles});
    } catch (err) {
        logger.error('Error listing audio files:', err);
        return res.status(500).json({error: 'Internal server error'});
    }
});

// ==== API: Preload instruments ====
app.post('/api/preload', async (req, res) => {
    try {
        const {instruments, sessionId} = req.body;

        if (!instruments || !Array.isArray(instruments)) {
            return res.status(400).json({error: 'No instruments list provided or invalid format'});
        }

        const session = sessionsManager.get(sessionId);
        if (!session) {
            return res.status(404).json({error: 'Session not found'});
        }

        if (session.ws.readyState !== WebSocket.OPEN) {
            return res.status(400).json({error: 'WebChucK client not connected'});
        }

        preload_response = "";
        // Send preload request to WebChucK client
        session.ws.send(JSON.stringify({
            type: 'preload_instruments',
            instruments: instruments
        }));

        const response = await fetch(`http://localhost:${PORT}/api/debug/preload`);

        const data = await response.json();
        return res.status(200).json({
            message: data.error,
            sessionId: sessionId
        });

    } catch (err) {
        logger.error('Error sending preload request:', err);
        return res.status(500).json({error: 'Internal server error'});
    }
});

app.get('/api/debug/sessions', (req, res) => {
    const sessionInfo = {
        size: sessionsManager.size,
        keys: Array.from(sessionsManager.keys()),
        cwd: WORKING_DIRECTORY,
    };
    res.status(200).json(sessionInfo);
});

app.get('/api/debug/execution', (req, res) => {
    logger.info(execution_error_response || "No errors detected. Seems fine.")
    res.status(200).json({
        error: execution_error_response || "No errors detected. Seems fine."
    });
    execution_error_response = "";
});

app.get('/api/debug/preload', (req, res) => {
    logger.info(preload_response || "No errors detected. Seems fine.")
    res.status(200).json({
        error: preload_response || "No errors detected. Seems fine."
    });
});

// ==== Execute ChucK Code Tool ====
mcpServer.tool("executeChucK",
    "Executes ChucK code in a WebChucK session. This tool allows you to run ChucK audio programming language code in " +
    "the browser and create interactive sound applications. Best practices:\n" +
    "  \n" +
    "  * Always follow execution with a call to debugSessions to check for errors\n" +
    "  * Follow execution with a call to debugSessions to check for errors" +
    "  * ChucK uses the => operator for audio routing and assignments (e.g., SinOsc osc => dac;)\n" +
    "  * End statements with semicolons to avoid syntax errors\n" +
    "  * Use UGens (Unit Generators) like SinOsc, Noise, etc. for sound creation\n" +
    "  * Time is handled with :: notation (e.g., beat * 1::second + now => now;)\n" +
    "  \n" +
    "  Common mistakes include missing semicolons, undefined variables or using variables before they have been defined, and audio routing issues. ChucK execution " +
    "continues in the background until explicitly stopped with stopChucK.",
    {
        code: z.string().describe("The ChucK code to execute - MUST follow ChucK language syntax - no C or C++ syntax!"),
        sessionId: z.string().describe("Session ID for an existing WebChucK session - obtain this from getChucKSessions")
    },
    async ({code, sessionId}) => {
        try {
            // The issue: code is being sent with extra wrapping
            // Just send the raw code string directly

            const response = await fetch(`http://localhost:${PORT}/api/execute`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    // Just pass the code directly, don't wrap it further
                    code,
                    sessionId
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            return {
                content: [{
                    type: "text",
                    text: data.message || "Execution started"
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{
                    type: "text",
                    text: `Error executing ChucK code: ${errorMessage}`
                }]
            };
        }
    }
);


// ==== Stop ChucK Code Tool ====
mcpServer.tool("stopChucK",
    "Stops the execution of a ChucK session. Use before starting a new composition to ensure clean playback.",
    {
        sessionId: z.string().describe("Session ID for an existing WebChucK session")
    },
    async ({sessionId}) => {
        try {
            const response = await fetch(`http://localhost:${PORT}/api/stop`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({sessionId}),
            });

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            return {
                content: [{
                    type: "text",
                    text: data.message || "Execution stopped"
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{
                    type: "text",
                    text: `Error stopping ChucK code: ${errorMessage}`
                }]
            };
        }
    }
);

// ==== List Audio Files Tool ====
mcpServer.tool("listAudioFiles",
    "Lists all available audio files that can be preloaded as instruments. Use this first to identify instruments to load with preloadInstruments. Note that not all listed instruments may load successfully.",
    {},
    async () => {
        try {
            let audioFiles: string[] = [];

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
                        // Add audio files to the list with relative path from AUDIO_DIR
                        const relativePath = path.relative(AUDIO_DIR, fullPath);
                        audioFiles.push(relativePath);
                    }
                }
            }

            // Start scanning from the root audio directory
            scanDirectory(AUDIO_DIR);

            // Format the output with folder structure
            const formattedOutput = audioFiles.join('\n');

            return {
                content: [{
                    type: "text",
                    text: `Available audio files:\n${formattedOutput}`
                }]
            };
        } catch (err) {
            logger.error('Error listing audio files:', err);
            return {
                content: [{
                    type: "text",
                    text: `Error listing audio files: ${err}`
                }]
            };
        }
    }
);

// ==== Get Active Sessions Tool ====
mcpServer.tool("getChucKSessions",
    "The getChucKSessions tool lists all active WebChucK sessions and their unique identifiers, allowing multiple WebChucK clients to be used as an ensemble:\n" +
    "\n" +
    "* Call this tool if you don't have a session Id yet, or when you get a 404 error\n" +
    "* The tool returns the total number of active sessions and their respective session IDs\n" +
    "* Only one session can be addressed at a time through the tools, so interactions with multiple sessions require separate explicit tool calls",
    {},
    async () => {
        try {
            const response = await fetch(`http://localhost:${PORT}/api/debug/sessions`);

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();
            const activeSessions = data.keys || [];

            return {
                content: [{
                    type: "text",
                    text: `Active WebChucK sessions: ${activeSessions.length}\n${
                        activeSessions.join('\n')
                    }`
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{
                    type: "text",
                    text: `Error getting sessions: ${errorMessage}`
                }]
            };
        }
    }
);

// ==== Preload Instruments Tool ====
mcpServer.tool("preloadInstruments",
    "Load instrument samples before using them in your composition. This is critical for sample-based music:\n" +
    "\n" +
    "* First use listAudioFiles to see all available instruments\n" +
    "* Then select instruments you want to use (choose ALL at once - instruments aren't loaded additively)\n" +
    "* Call preloadInstruments with an array of all your chosen instruments\n" +
    "* Check debugSessions after preloading to confirm which instruments loaded successfully\n" +
    "* Use ONLY instruments that appear in the debugSessions results\n" +
    "* When playing samples, use the exact virtualFilenames provided in the debugSessions output\n" +
    "* If instruments don't show up in debugSessions results, try different instruments",
    {
        instruments: z.array(z.string()).describe("Array of instrument names to preload"),
        sessionId: z.string().describe("Session ID for an existing WebChucK session")
    },
    async ({instruments, sessionId}) => {
        try {
            // The issue: code is being sent with extra wrapping
            // Just send the raw instruments array directly

            const response = await fetch(`http://localhost:${PORT}/api/preload`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    instruments,
                    sessionId
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            return {
                content: [{
                    type: "text",
                    text: data.message || "Preload request sent"
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{
                    type: "text",
                    text: `Error preloading instruments: ${errorMessage}`
                }]
            };
        }
    }
);

mcpServer.tool("playWithInstruments",
    "A convenience function that combines preloading instruments and executing code in one step. This is useful for creating compositions that immediately use the loaded instruments:\n" +
    "\n" +
    "* Handles both preloading the specified instruments and executing the provided ChucK code\n" +
    "* More efficient than calling preloadInstruments and executeChucK separately\n" +
    "* Still requires checking debugSessions afterward to verify which instruments loaded successfully\n" +
    "* If you need to know exactly which instruments loaded before writing your code, use the separate preloadInstruments approach instead\n" +
    "* Remember that instruments aren't loaded additively - specify all instruments you need in a single call\n" +
    "\n" +
    "This tool can streamline your workflow if you know exactly which instruments you want to use, but it's less flexible if you need to check which instruments successfully loaded before finalizing your composition.",
    {
        code: z.string().describe("The ChucK code to execute"),
        instruments: z.array(z.string()).describe("Array of instrument names to preload before execution"),
        sessionId: z.string().describe("Session ID for an existing WebChucK session")
    },
    async ({ code, instruments, sessionId }) => {
        try {
            // First preload the instruments
            const preloadResponse = await fetch(`http://localhost:${PORT}/api/preload`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    instruments,
                    sessionId
                }),
            });

            if (!preloadResponse.ok) {
                throw new Error(`Preload error: ${preloadResponse.status}`);
            }

            // Wait a moment for preloading to complete
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Then execute the code
            const executeResponse = await fetch(`http://localhost:${PORT}/api/execute`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    code,
                    sessionId
                }),
            });

            if (!executeResponse.ok) {
                throw new Error(`Execute error: ${executeResponse.status}`);
            }

            const data = await executeResponse.json();

            return {
                content: [{
                    type: "text",
                    text: `Preloaded instruments (${instruments.join(', ')}) and started execution: ${data.message || "Code running"}`
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{
                    type: "text",
                    text: `Error: ${errorMessage}`
                }]
            };
        }
    }
);


mcpServer.tool("debugExecutions",
    "Provides detailed information about ChucK code execution results. Use this after calling executeChucK to:\n" +
    "\n" +
    "* Check for syntax errors in your ChucK code\n" +
    "* View error messages with line numbers and column positions\n" +
    "* Identify runtime issues like invalid operations or type mismatches\n" +
    "* Verify if your code executed successfully\n" +
    "\n" +
    "Always call this after executeChucK to ensure your code is running correctly. Error messages include line numbers to help pinpoint issues in complex code.",
    {},
    async () => {
        try {
            const execution_result = await fetch(`http://localhost:${PORT}/api/debug/execution`);

            if (!execution_result.ok) {
                throw new Error(`HTTP error: ${execution_result.status}`);
            }

            const execution_data = await execution_result.json();

            return {
                content: [{
                    type: "text",
                    text: `Execution Results: ${JSON.stringify(execution_data, null, 2)}`

                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(errorMessage)
            return {
                content: [{
                    type: "text",
                    text: `Error fetching debug data : ${errorMessage}`
                }]
            };
        }
    });

mcpServer.tool("debugPreload",
    "Shows detailed results of instrument preloading operations. Use this after preloadInstruments to:\n" +
    "\n" +
    "* Confirm which specific instrument samples loaded successfully\n" +
    "* Get the exact virtualFilenames required for playing samples\n" +
    "* Identify any instruments that failed to load\n" +
    "* Ensure you have all necessary sounds before composing\n" +
    "\n" +
    "This is critical for sample-based compositions - only use the virtualFilenames that appear in these results. If an instrument doesn't appear here after preloading, you'll need to choose alternative instruments.\n" +
    "The results show the complete mapping between server files and virtual filenames you'll use in your code. Always reference the exact virtualFilenames (e.g., \"audio_files_Waves_FluidR3_GM_choir_aahs_C3.wav\") when playing samples, not the general instrument names.",
    {},
    async () => {
        try {
            const preload_result = await fetch(`http://localhost:${PORT}/api/debug/preload`);

            if (!preload_result.ok) {
                throw new Error(`HTTP error: ${preload_result.status}`);
            }

            const preload_data = await preload_result.json();

            return {
                content: [{
                    type: "text",
                    text: `Preload Results: ${JSON.stringify(preload_data, null, 2)}`

                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(errorMessage)
            return {
                content: [{
                    type: "text",
                    text: `Error fetching debug data : ${errorMessage}`
                }]
            };
        }
    });


mcpServer.tool("debugSessions",
    "Shows general information about active WebChucK sessions. Use this to:\n" +
    "\n" +
    "* View all active session IDs and their status\n" +
    "* Check the overall health of the ChucK environment\n" +
    "* Identify the working directory of sessions\n" +
    "* Get a high-level overview before using more specific debug tools\n" +
    "\n" +
    "This tool gives you session-level information but doesn't provide detailed execution or preload results. Use debugExecutions or debugPreload for those specific tasks.",
    {},
    async () => {
        try {
            const session_result = await fetch(`http://localhost:${PORT}/api/debug/sessions`);

            if (!session_result.ok) {
                throw new Error(`HTTP error: ${session_result.status}`);
            }

            const session_data = await session_result.json();

            return {
                content: [{
                    type: "text",
                    text: `Session Data: ${JSON.stringify(session_data, null, 2)}\n`

                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(errorMessage)
            return {
                content: [{
                    type: "text",
                    text: `Error fetching debug data : ${errorMessage}`
                }]
            };
        }
    });

// ==== Create Dynamic Resource for Instrument Families ====
// mcpServer.resource(
//     "instrumentFamily",
//     new ResourceTemplate("instrument-family://{name}", {
//         list: async () => {
//             const families = [
//                 {name: "piano", description: "Piano instruments"},
//                 {name: "guitar", description: "Guitar instruments"},
//                 {name: "strings", description: "String instruments"},
//                 {name: "brass", description: "Brass instruments"},
//                 {name: "woodwind", description: "Woodwind instruments"},
//                 {name: "percussion", description: "Percussion instruments"},
//                 {name: "synth", description: "Synthesizer sounds"}
//             ];
//             return {
//                 resources: families.map(family => ({
//                     name: family.name,
//                     uri: `instrument-family://${family.name}`
//                 }))
//             };
//         }
//     }),
//     async (uri, {name}) => {
//         // Map of instrument family to specific directories to preload
//         const familyMap = {
//             "piano": ["acoustic_grand_piano", "bright_acoustic_piano", "electric_grand_piano", "electric_piano_1", "electric_piano_2"],
//             "guitar": ["acoustic_guitar_nylon", "acoustic_guitar_steel", "electric_guitar_clean", "electric_guitar_jazz", "electric_guitar_muted", "distortion_guitar"],
//             "strings": ["violin", "viola", "cello", "contrabass", "tremolo_strings", "pizzicato_strings"],
//             "brass": ["trumpet", "trombone", "tuba", "french_horn", "brass_section"],
//             "woodwind": ["flute", "piccolo", "oboe", "english_horn", "clarinet", "alto_sax", "tenor_sax", "baritone_sax"],
//             "percussion": ["timpani", "steel_drums", "taiko_drum", "agogo", "glockenspiel", "tubular_bells"],
//             "synth": ["synth_bass_1", "synth_bass_2", "synth_strings_1", "synth_strings_2", "synth_pad_1", "synth_pad_2"]
//         };
//
//         const instruments = familyMap[name] || [];
//
//         if (instruments.length === 0) {
//             return {
//                 contents: [{
//                     uri: uri.href,
//                     text: `# Instrument Family: ${name}
// No specific instruments defined for this family.
// Please try another family or preload specific instruments directly.`
//                 }]
//             };
//         }
//
//         return {
//             contents: [{
//                 uri: uri.href,
//                 text: `# Instrument Family: ${name}
// This family includes the following instruments:
// ${instruments.map(i => `- ${i}`).join('\n')}
//
// To preload these instruments before playing music, use the preloadInstruments tool:
//
// \`\`\`
// preloadInstruments(instruments: ${JSON.stringify(instruments)})
// \`\`\`
//
// After preloading, you can use these instruments in your ChucK code.`
//             }]
//         };
//     }
// );

// ==== Create dynamic resource for audio files ====
mcpServer.resource(
    "audioFile",
    new ResourceTemplate("audio://{filename}", {
        list:
            async () => {
                try {
                    const files = fs.readdirSync(AUDIO_DIR).filter(file =>
                        file.endsWith('.wav') || file.endsWith('.aiff')
                    );
                    return {
                        resources: files.map(filename => ({
                            name: filename,
                            uri: `audio://${filename}`
                        }))
                    };
                } catch (error) {
                    logger.error('Error listing audio files for MCP resource:', error);
                    return {resources: []};
                }
            }
    }),
    async (uri, {filename}) => {
        const filepath = path.join(AUDIO_DIR, filename.toString());

        try {
            const stats = fs.statSync(filepath);
            if (fs.existsSync(filepath)) {
                return {
                    contents: [{
                        uri: uri.href,
                        text: `Audio file: ${filename}
Size: ${(stats.size / 1024).toFixed(2)} KB
Created: ${stats.birthtime.toISOString()}
Last modified: ${stats.mtime.toISOString()}
        
To play this file, use the executeChucK tool with this code:
\`\`\`
// Play audio file
SndBuf buf => dac;
"${filename}" => buf.read;
0.5 => buf.gain;
buf.length() => now;
\`\`\``
                    }]
                };
            } else {
                return {
                    contents: [{
                        uri: uri.href,
                        text: `Error: Audio file not found: ${filename}`
                    }]
                };
            }
        } catch (error) {
            logger.error(`Error accessing audio file ${filename}:`, error);
            return {
                contents: [{
                    uri: uri.href,
                    text: `Error accessing audio file: ${error}`
                }]
            };
        }
    }
);

// ==== Create Dynamic Resource for ChucK Examples ====
mcpServer.resource(
    "chuck-example",
    new ResourceTemplate("chuck-example://{category}/{name}", {
        list: async () => {
            const examples = [
                {category: "basics", name: "sine-wave"},
                {category: "basics", name: "square-wave"},
                {category: "basics", name: "fm-synthesis"},
                {category: "effects", name: "reverb"},
                {category: "effects", name: "echo"},
                {category: "effects", name: "chorus"},
                {category: "mixing", name: "simple-mixer"},
                {category: "mixing", name: "stereo-panner"},
                {category: "sampling", name: "file-playback"},
                {category: "sampling", name: "granular"},
                {category: "drums", name: "drum-machine"},
                {category: "drums", name: "drum-sequencer"}
            ];
            return {
                resources: examples.map(example => ({
                    name: `${example.category}: ${example.name}`,
                    uri: `chuck-example://${example.category}/${example.name}`
                }))
            };
        }
    }),
    async (uri, {category, name}) => {
        // Create example code based on category and name
        let code = "";
        let description = "";

        // Basic examples
        if (category === "basics") {
            if (name === "sine-wave") {
                code = `// Simple sine wave oscillator
SinOsc s => dac;
0.5 => s.gain;
220 => s.freq;
2::second => now;`;
                description = "A basic sine wave oscillator at 220Hz";
            } else if (name === "square-wave") {
                code = `// Square wave oscillator
SqrOsc s => dac;
0.3 => s.gain;  // Lower gain for square wave to avoid clipping
220 => s.freq;
2::second => now;`;
                description = "A basic square wave oscillator at 220Hz";
            } else if (name === "fm-synthesis") {
                code = `// FM synthesis example
SinOsc modulator => SinOsc carrier => dac;
// Carrier settings
0.5 => carrier.gain;
440 => carrier.freq;
// Modulator settings
300 => modulator.freq;
1000 => modulator.gain;
// Let it play
5::second => now;`;
                description = "Frequency modulation synthesis example";
            }
        }

        // Effects examples
        else if (category === "effects") {
            if (name === "reverb") {
                code = `// Reverb effect example
SinOsc s => JCRev rev => dac;
0.5 => s.gain;
440 => s.freq;
0.2 => rev.mix;
5::second => now;`;
                description = "Adding reverb to a sine wave oscillator";
            } else if (name === "echo") {
                code = `// Echo effect example
SinOsc s => Echo echo => dac;
0.5 => s.gain;
440 => s.freq;
250::ms => echo.delay;
0.5 => echo.mix;
0.7 => echo.gain;
5::second => now;`;
                description = "Adding echo to a sine wave oscillator";
            } else if (name === "chorus") {
                code = `// Chorus effect example
SinOsc s => Chorus chorus => dac;
0.5 => s.gain;
440 => s.freq;
0.5 => chorus.mix;
5::second => now;`;
                description = "Adding chorus to a sine wave oscillator";
            }
        }

        // Mixing examples
        else if (category === "mixing") {
            if (name === "simple-mixer") {
                code = `// Simple mixing example
SinOsc s1 => Gain mixer => dac;
SqrOsc s2 => mixer;
TriOsc s3 => mixer;

0.2 => s1.gain;
0.1 => s2.gain;
0.15 => s3.gain;
0.8 => mixer.gain;

220 => s1.freq;
440 => s2.freq;
880 => s3.freq;

5::second => now;`;
                description = "Mixing multiple oscillators together";
            } else if (name === "stereo-panner") {
                code = `// Stereo panning example
SinOsc s => Pan2 pan => dac;
0.5 => s.gain;
440 => s.freq;

// Pan from left to right
-1.0 => pan.pan;
1::second => now;

-0.5 => pan.pan;
1::second => now;

0.0 => pan.pan;
1::second => now;

0.5 => pan.pan;
1::second => now;

1.0 => pan.pan;
1::second => now;`;
                description = "Panning a sound from left to right";
            }
        }

        // Sampling examples
        else if (category === "sampling") {
            if (name === "file-playback") {
                code = `// File playback example
// Note: Replace "sample.wav" with an actual file from your system
SndBuf buf => dac;
"sample.wav" => buf.read;
0.5 => buf.gain;
buf.length() => now;`;
                description = "Playing back an audio file";
            } else if (name === "granular") {
                code = `// Simple granular synthesis
// Note: Replace "sample.wav" with an actual file from your system
SndBuf buf => dac;
"sample.wav" => buf.read;
0.5 => buf.gain;

// Randomly play short grains from the sample
for (0 => int i; i < 50; i++) {
    // Random position
    Math.random() * buf.samples() => buf.pos;

    // Random gain
    Math.random() * 0.5 => buf.gain;

    // Play a short grain
    100::ms => now;
}`;
                description = "Basic granular synthesis using an audio file";
            }
        }

        // Drum examples
        else if (category === "drums") {
            if (name === "drum-machine") {
                code = `// Simple drum machine using synthesis
// Kick drum
SndBuf kick => dac;
me.dir() + "/audio_files/kick.wav" => kick.read;
0.5 => kick.gain;

// Snare drum
SndBuf snare => dac;
me.dir() + "/audio_files/snare.wav" => snare.read;
0.5 => snare.gain;

// Hi-hat
SndBuf hihat => dac;
me.dir() + "/audio_files/hihat.wav" => hihat.read;
0.3 => hihat.gain;

// Make sure they don't play automatically
kick.samples() => kick.pos;
snare.samples() => snare.pos;
hihat.samples() => hihat.pos;

// Simple pattern
for (0 => int i; i < 8; i++) {
    // Kick on beats 0 and 4
    if (i == 0 || i == 4) {
        0 => kick.pos;
    }

    // Snare on beats 2 and 6
    if (i == 2 || i == 6) {
        0 => snare.pos;
    }

    // Hi-hat on all beats
    0 => hihat.pos;

    // Wait for next beat
    0.25::second => now;
}`;
                description = "A simple drum machine pattern";
            } else if (name === "drum-sequencer") {
                code = `// More complex drum sequencer
// Load drum samples (or use synthesized sounds)
SndBuf kick => dac;
SndBuf snare => dac;
SndBuf hihat => dac;
SndBuf clap => dac;

// Load samples (adjust paths as needed)
me.dir() + "/audio_files/kick.wav" => kick.read;
me.dir() + "/audio_files/snare.wav" => snare.read;
me.dir() + "/audio_files/hihat.wav" => hihat.read;
me.dir() + "/audio_files/clap.wav" => clap.read;

// Set gains
0.5 => kick.gain;
0.4 => snare.gain;
0.3 => hihat.gain;
0.4 => clap.gain;

// Make sure samples don't play automatically
kick.samples() => kick.pos;
snare.samples() => snare.pos;
hihat.samples() => hihat.pos;
clap.samples() => clap.pos;

// Define patterns (1 = play, 0 = silent)
 @=> int kickPattern;
 @=> int snarePattern;
[1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1] @=> int hihatPattern;
 @=> int clapPattern;

// Tempo
0.125::second => dur beat;

// Play the sequence
for (0 => int t; t < 4; t++) {
    for (0 => int i; i < 16; i++) {
        // Play the drums
        if (kickPattern[i]) 0 => kick.pos;
        if (snarePattern[i]) 0 => snare.pos;
        if (hihatPattern[i]) 0 => hihat.pos;
        if (clapPattern[i]) 0 => clap.pos;

        // Advance time
        beat => now;
    }
}`;
                description = "A more complex drum sequencer with patterns";
            }
        }

        // Default code if no match found
        if (code === "") {
            code = `// Example not found for ${category}/${name}
// Here's a simple oscillator instead
SinOsc s => dac;
0.5 => s.gain;
440 => s.freq;
2::second => now;`;
            description = "Requested example not found. Here's a simple oscillator instead.";
        }

        return {
            contents: [{
                uri: uri.href,
                text: `# ChucK Example: ${category}/${name}

${description}

\`\`\`
${code}
\`\`\`

To execute this code, use the executeChucK tool.`
            }]
        };
    }
);

mcpServer.prompt("webchuck_syntax_reminder",
    "A reminder prompt to help the AI chat agent stay on track.",
    () => ({
        messages: [{
            role: "user",
            content: {
                type: "text",
                text: `WebChucK Syntax Reminder:

When working with ChucK in this conversation, please follow these guidelines to avoid common errors:

1. WORKFLOW ESSENTIALS:
   - Always get a session ID first with getChucKSessions
   - Load ALL instruments at once with preloadInstruments (not incrementally)
   - Use debugPreload to verify which instruments actually loaded
   - Only use the EXACT virtualFilenames from debugPreload results
   - Check debugExecutions after every code execution

2. CHUCK-SPECIFIC SYNTAX (NOT C/C++):
   - ChucK uses => for audio routing AND assignment (different from C/C++):
     • 0.5 => float gain;  // ChucK assignment (not gain = 0.5;)
     • SinOsc sin => dac;  // ChucK audio routing (totally unique)
   - Time requires the :: operator: 1::second (not found in C/C++)
   - Connect audio units with => not with function calls
   - Sporking: spork ~ functionName(); (ChucK's way to create concurrent processes)
   - Time advancement: 1::second => now; (no equivalent in C/C++)

3. COMMON ERRORS TO AVOID:
   - Don't use C/C++ assignment with = for ChucK assignment (use => instead)
   - Cannot multiply (*) directly on UGen object references (use intermediate variables)
   - Cannot use "beat" directly as a duration without first defining it as a dur type
   - Don't use C/C++ thread creation (use ChucK's spork ~ instead)
   - Don't reference array indices outside their bounds
   - Don't assume instruments loaded successfully without checking debugPreload
   - Don't create filenames - use exact virtualFilenames from debugPreload

4. SAMPLE PLAYBACK:
   - SndBuf requires exact virtualFilenames (from debugPreload results)
   - Reset playhead with 0 => buf.pos; before playing
   - Set gain appropriately (0.0-1.0 range is typical)
   - Use ADSR envelopes for clean starts/stops

5. AUDIO ROUTING BASICS:
   - Sound generators → processors → dac (output)
   - Example: SinOsc osc => LPF filter => NRev reverb => dac;
   - Connect to blackhole for control signals that don't make sound

Always check errors with debugExecutions after each code execution. When in doubt, use intermediate variables for complex operations. Remember that ChucK has its own unique syntax that differs significantly from C, C++, and JavaScript.`
            }
        }]
    })
);

mcpServer.prompt("webchuck_demo",
    "A demo prompt to showcase the Chuck features.",
    () => ({
        messages: [{
            role: "user",
            content: {
                type: "text",
                text: `# ChucK Sonic Playground: Crafting Your 80s Synthwave Universe

In this exercise, you'll create a mesmerizing 80s-inspired synthwave track using ChucK's powerful real-time sound synthesis capabilities.

## Background

ChucK offers precise timing control and flexible audio manipulation—perfect for creating the lush, atmospheric textures and pulsing rhythms of synthwave music. You'll build a track from the ground up, layering different elements to achieve that classic retro-futuristic sound.

## Your Mission

Create a continuously looping synthwave composition with these key elements:

1. **Rhythmic Foundation**: Four-on-the-floor kick pattern with synthetic percussion
2. **Melodic Elements**: Arpeggiated synthesizers and lead melody lines
3. **Atmospheric Textures**: Pads and ambient sounds with generous reverb
4. **Dynamic Evolution**: Filter sweeps and gradual introduction of elements

## Getting Started

### Setting Your Environment

Begin with tempo and musical key settings:
\`\`\`chuck
// Set BPM for that perfect 80s pulse
110 => float BPM;
(60.0/BPM)::second => dur beat;

// A minor is perfect for that melancholic synthwave feel
[57, 59, 60, 62, 64, 65, 67, 69] @=> int amin[];
\`\`\`

### Building Your Instrument Arsenal

Create at least these core instruments:

1. **Bass**: Deep, punchy foundation
   - Electric bass samples or SinOsc/SawOsc with envelope shaping
   - Apply subtle filtering for warmth

2. **Drums**: Synthetic percussion
   - Kick drum using SinOsc with rapid pitch drop
   - Snare using filtered noise
   - Hi-hats using high-passed noise with short envelope

3. **Lead Synth**: Memorable melody
   - SinOsc or SawOsc through resonant filter
   - Add delay and reverb for spaciousness

4. **Atmospheric Pads**: Lush backdrop
   - Multiple oscillators slightly detuned
   - Long attack and release times
   - Heavy reverb for that dreamy quality

5. **Arpeggiated Elements**: Movement and rhythm
   - Rapid sequencing of chord tones
   - Consider classic patterns (up, down, up-down)

## Programming Techniques

Implement these ChucK-specific techniques:

1. **Sporking**: Use \`spork ~\` to create concurrent sound layers
2. **Time Loops**: Create clean loop structures that synchronize perfectly
3. **Parameter Automation**: Gradually change filter cutoffs over time
4. **Modulation**: Use LFOs to create movement in your sounds
5. **Signal Processing**: Add effects chains with reverb, delay, and filtering

## Structure Your Composition

1. **Intro Section**: Begin with minimal elements (perhaps just bass and drums)
2. **Build Section**: Gradually introduce arpeggios and pads
3. **Main Section**: Full arrangement with lead melody
4. **Variation**: Subtle changes to keep interest during looping

## Sample Starting Framework

\`\`\`chuck
// Master output path with reverb
NRev masterReverb => dac;
0.1 => masterReverb.mix;

// Function for filter sweeps - essential for synthwave
fun void filterSweep(LPF filter) {
    while(true) {
        // Sweep logic here
    }
}

// Function for your lead melody
fun void playLead() {
    // Melody sequencing here
}

// Function for endless looping
fun void mainLoop() {
    while(true) {
        // Main sequence logic
    }
}
\`\`\`

## Creative Challenges

1. **Retro Artifact**: Add vinyl crackle or tape hiss for authentic retro feel
2. **Dramatic Transitions**: Program filter drops or tension-building effects
3. **Evolving Texture**: Create pads that slowly evolve over multiple loops
4. **Dynamic Response**: Use math functions to create natural-feeling dynamics

Remember, the goal is to create a lush, immersive synthwave track that captures that perfect 80s nostalgic vibe while looping seamlessly forever. Let your digital heart compose the soundtrack to a neon-lit cyberpunk world!`
            }
        }]
    })
);

mcpServer.prompt("webchuck_assistant_guide",
    "A prompt to guide the user.",
    () => ({
        messages: [{
            role: "user",
            content: {
                type: "text",
                text: `    # WebChucK MCP Assistant Guide

    The WebChucK MCP system includes an AI assistant that can help you with your music and audio development process. Here's how to use it:

    ## Executing Code

    Use the \`executeCode\` tool to execute ChucK in WebChucK

    ## Stop Code Execution

    Use the \`stopExecution\` tool to stop any ChucK code that might currently be running in WebChucK

    ## Working with the Assistant

    1. Start by getting insights about your task
    2. Ask for specific suggestions based on the insights
    3. Implement the suggestions using the WebChucK MCP tools
    4. Get new insights to see how your changes have improved the sound

    The assistant works best when you provide specific context about what you're trying to achieve. For example, instead of asking for general suggestions, ask for suggestions about a specific aspect of your audio journey.

    Remember that the assistant is a tool to enhance your creativity, not replace it. Use its suggestions as inspiration for your own ideas.`
            }
        }]
    }));

// Start the HTTP server
server.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`WebSocket server available at ws://localhost:${PORT}`);
    logger.info(`Audio files directory: ${AUDIO_DIR}`);
});

await mcpServer.connect(transport);

app.use(express.static(path.join(__dirname, 'public')));

// Handle shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    await server.closeAllConnections();
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
