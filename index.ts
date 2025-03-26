import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import WebSocket, { WebSocketServer } from "ws"; // Corrected import
import http from "http";
import cors from "cors";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create directory for audio files if it doesn't exist
const AUDIO_DIR = path.join(process.cwd(), 'audio_files');
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Create Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server }); // Corrected instantiation

// Store active WebChucK sessions
const sessions = new Map<string, {
    ws: WebSocket,
    status: 'idle' | 'executing',
    activeCode: string | null
}>();

// Store audio outputs
const audioOutputs = new Map<string, Buffer[]>();

// ==== WebSocket Connection Handler ====
wss.on('connection', (ws) => {
    const sessionId = uuidv4();
    console.log(`New WebChucK client connected: ${sessionId}`);

    sessions.set(sessionId, {
        ws,
        status: 'idle',
        activeCode: null
    });

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
                case 'error':
                    console.error(`Error from WebChucK client ${sessionId}:`, data.message);
                    break;
                default:
                    console.log(`Unknown message type from WebChucK client: ${data.type}`);
            }
        } catch (err) {
            console.error('Error processing WebSocket message:', err);
        }
    });

    // Handle WebSocket close
    ws.on('close', () => {
        console.log(`WebChucK client disconnected: ${sessionId}`);
        sessions.delete(sessionId);
        if (audioOutputs.has(sessionId)) {
            audioOutputs.delete(sessionId);
        }
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
        console.error(`WebSocket error for session ${sessionId}:`, error);
    });
});

// ==== WebChucK Status Update Handler ====
function handleStatusUpdate(sessionId: string, data: any) {
    const session = sessions.get(sessionId);
    if (!session) return;

    session.status = data.status;
    console.log(`Session ${sessionId} status updated to: ${data.status}`);
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

    console.log(`Audio saved to: ${filepath}`);

    // Clear the stored chunks
    audioOutputs.set(sessionId,[]);

    // Notify the client
    const session = sessions.get(sessionId);
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
        const { code, sessionId } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'No ChucK code provided' });
        }

        const session = sessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (session.ws.readyState !== WebSocket.OPEN) {
            return res.status(400).json({ error: 'WebChucK client not connected' });
        }

        // Store the active code
        session.activeCode = code;
        session.status = 'executing';

        // Send code to WebChucK client
        session.ws.send(JSON.stringify({
            type: 'execute_code',
            code
        }));

        return res.status(200).json({
            message: 'Code execution started',
            sessionId
        });

    } catch (err) {
        console.error('Error executing ChucK code:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ==== API: Stop ChucK execution ====
app.post('/api/stop', async (req, res) => {
    try {
        const { sessionId } = req.body;

        const session = sessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (session.ws.readyState !== WebSocket.OPEN) {
            return res.status(400).json({ error: 'WebChucK client not connected' });
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
        console.error('Error stopping ChucK execution:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ==== API: Get session status ====
app.get('/api/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;

    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
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
        console.error('Error uploading file:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ==== API: Download audio file ====
app.get('/api/audio/:filename', (req, res) => {
    const { filename } = req.params;
    const filepath = path.join(AUDIO_DIR, filename);

    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.sendFile(filepath);
});

// ==== API: List available audio files ====
app.get('/api/audio', (req, res) => {
    try {
        const files = fs.readdirSync(AUDIO_DIR).filter(file =>
            file.endsWith('.wav') || file.endsWith('.aiff')
        );

        return res.status(200).json({ files });
    } catch (err) {
        console.error('Error listing audio files:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ==== Create MCP Server ====
const mcpServer = new McpServer({
    name: "WebChucK",
    version: "1.0.0"
});

// ==== Execute ChucK Code Tool ====
mcpServer.tool("executeChucK",
    {
        code: z.string().describe("The ChucK code to execute"),
        sessionId: z.string().optional().describe("Optional session ID for an existing WebChucK session")
    },
    async ({ code, sessionId }) => {
        try {
            // If no session ID is provided, use the first available session
            let actualSessionId = sessionId;

            if (!actualSessionId) {
                // Get the first available session
                for (const [id, session] of sessions.entries()) {
                    if (session.ws.readyState === WebSocket.OPEN) {
                        actualSessionId = id;
                        break;
                    }
                }
            }

            if (!actualSessionId || !sessions.has(actualSessionId)) {
                return {
                    content: [{
                        type: "text",
                        text: "Error: No active WebChucK session available. Please ensure a WebChucK client is connected."
                    }]
                };
            }

            const session = sessions.get(actualSessionId)!;

            if (session.ws.readyState !== WebSocket.OPEN) {
                return {
                    content: [{
                        type: "text",
                        text: "Error: WebChucK client not connected."
                    }]
                };
            }

            // Store the active code
            session.activeCode = code;
            session.status = 'executing';

            // Send code to WebChucK client
            session.ws.send(JSON.stringify({
                type: 'execute_code',
                code
            }));

            return {
                content: [{
                    type: "text",
                    text: `ChucK code execution started on session ${actualSessionId}`
                }]
            };
        } catch (error) {
            console.error('Error in executeChucK tool:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error executing ChucK code: ${error}`
                }]
            };
        }
    }
);

// ==== Stop ChucK Code Tool ====
mcpServer.tool("stopChucK",
    {
        sessionId: z.string().optional().describe("Optional session ID for an existing WebChucK session")
    },
    async ({ sessionId }) => {
        try {
            // If no session ID is provided, use the first available session
            let actualSessionId = sessionId;

            if (!actualSessionId) {
                // Get the first available session
                for (const [id, session] of sessions.entries()) {
                    if (session.ws.readyState === WebSocket.OPEN) {
                        actualSessionId = id;
                        break;
                    }
                }
            }

            if (!actualSessionId || !sessions.has(actualSessionId)) {
                return {
                    content: [{
                        type: "text",
                        text: "Error: No active WebChucK session available."
                    }]
                };
            }

            const session = sessions.get(actualSessionId)!;

            if (session.ws.readyState !== WebSocket.OPEN) {
                return {
                    content: [{
                        type: "text",
                        text: "Error: WebChucK client not connected."
                    }]
                };
            }

            // Send stop command to WebChucK client
            session.ws.send(JSON.stringify({
                type: 'stop_execution'
            }));

            session.status = 'idle';

            return {
                content: [{
                    type: "text",
                    text: `ChucK code execution stopped on session ${actualSessionId}`
                }]
            };
        } catch (error) {
            console.error('Error in stopChucK tool:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error stopping ChucK code: ${error}`
                }]
            };
        }
    }
);

// ==== List Audio Files Tool ====
mcpServer.tool("listAudioFiles",
    {},
    async () => {
        try {
            const files = fs.readdirSync(AUDIO_DIR).filter(file =>
                file.endsWith('.wav') || file.endsWith('.aiff')
            );

            return {
                content: [{
                    type: "text",
                    text: `Available audio files:\n${files.join('\n')}`
                }]
            };
        } catch (err) {
            console.error('Error listing audio files:', err);
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
    {},
    async () => {
        const activeSessions = [];

        for (const [id, session] of sessions.entries()) {
            if (session.ws.readyState === WebSocket.OPEN) {
                activeSessions.push({
                    id,
                    status: session.status
                });
            }
        }

        return {
            content: [{
                type: "text",
                text: `Active WebChucK sessions: ${activeSessions.length}\n${
                    activeSessions.map(session => `- ${session.id} (${session.status})`).join('\n')
                }`
            }]
        };
    }
);

// ==== Create dynamic resource for audio files ====
mcpServer.resource(
    "audioFile",
    new ResourceTemplate("audio://{filename}", {
        list: async () => {
            try {
                const files = fs.readdirSync(AUDIO_DIR).filter(file =>
                    file.endsWith('.wav') || file.endsWith('.aiff')
                );
                return files.map(filename => ({ filename }));
            } catch (error) {
                console.error('Error listing audio files for MCP resource:', error);
                return;
            }
        }
    }),
    async (uri, { filename }) => {
        const filepath = path.join(AUDIO_DIR, filename);

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
            console.error(`Error accessing audio file ${filename}:`, error);
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
    "chuckExample",
    new ResourceTemplate("chuck-example://{category}/{name}", {
        list: async () => {
            // Define available example categories and names
            const examples = [
                { category: "basics", name: "sine-wave" },
                { category: "basics", name: "square-wave" },
                { category: "basics", name: "fm-synthesis" },
                { category: "effects", name: "reverb" },
                { category: "effects", name: "echo" },
                { category: "effects", name: "chorus" },
                { category: "mixing", name: "simple-mixer" },
                { category: "mixing", name: "stereo-panner" },
                { category: "sampling", name: "file-playback" },
                { category: "sampling", name: "granular" },
                { category: "drums", name: "drum-machine" },
                { category: "drums", name: "drum-sequencer" }
            ];
            return examples;
        }
    }),
    async (uri, { category, name }) => {
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
            contents:  [{
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

// Start the HTTP server
const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server available at ws://localhost:${PORT}`);
    console.log(`Audio files directory: ${AUDIO_DIR}`);
});

// Choose the appropriate transport
// if (process.env.MCP_TRANSPORT === 'http') {
//     // Use HTTP transport (Consider using SSEServerTransport instead)
//     const transport = new HttpServerTransport({ // Consider replacing with SSEServerTransport
//         app,
//         path: '/api/mcp',
//     });
//     await mcpServer.connect(transport);
//     console.log(`MCP HTTP server available at http://localhost:${PORT}/api/mcp`);
// } else {
    // Use STDIO transport by default
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.log('MCP server connected via STDIO');
// }

app.use(express.static(path.join(__dirname, 'public')));