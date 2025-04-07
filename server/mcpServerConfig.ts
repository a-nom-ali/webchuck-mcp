import {Logger} from "../utils/logger.js";
import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";
import {SessionsManager, Session} from "./sessionsManager.js";
import {AudioService} from "./audioService.js";
import {z} from "zod";
import fs from "fs";
import path from "path";
import {ServerConfig} from "./config.js";

export class McpServerConfig {
    constructor(
        private mcpServer: McpServer,
        private sessionsManager: SessionsManager,
        private audioService: AudioService,
        private logger: Logger,
        private config: ServerConfig
    ) {
        this.configureTools();
    }

    private configureTools(): void {
        // ==== Execute ChucK Code Tool ====
        this.mcpServer.tool("executeChucK",
            "Executes ChucK code in a WebChucK session. This tool allows you to run ChucK audio programming language code in " +
            "the browser and create interactive sound applications. Best practices:\n" +
            "  \n" +
            "  * Always follow execution with a call to debugExecutions to check for errors\n" +
            "  * ChucK uses the => operator for audio routing and assignments (e.g., SinOsc osc => dac;)\n" +
            "  * End statements with semicolons to avoid syntax errors\n" +
            "  * Use UGens (Unit Generators) like SinOsc, Noise, etc. for sound creation\n" +
            "  * Time is handled with :: notation (e.g., beat * 1::second + now => now;)\n" +
            "  * Float and int real time parameter controls through global variables defined with @param annotations, e.g. \n" +
            "\n" +
            "// @param float values between 0 and 1\n" +
            "// @range 0.1 1.0\n" +
            "0.5 => global float gain;\n" +
            "  \n" +
            "  Common mistakes include missing semicolons, undefined variables or using variables before they have been defined, and not strictly adhering to Chuck syntax. ChucK execution " +
            "continues in the background until explicitly stopped with stopChucK, allowing script layering.",
            {
                code: z.string().describe("The ChucK code to execute - MUST follow ChucK language syntax - no C or C++ syntax!"),
                sessionId: z.string().describe("Session ID for an existing WebChucK session - obtain this from getChucKSessions")
            },
            async ({code, sessionId}) => {
                try {
                    // The issue: code is being sent with extra wrapping
                    // Just send the raw code string directly

                    const response = await fetch(`${this.config.publicUrl}/api/execute`, {
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
        this.mcpServer.tool("stopChucK",
            "Stops the execution of a ChucK session. Use before starting a new composition to ensure clean playback.",
            {
                sessionId: z.string().describe("Session ID for an existing WebChucK session")
            },
            async ({sessionId}) => {
                try {
                    const response = await fetch(`${this.config.publicUrl}/api/stop`, {
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

// ==== Get Code From Editor Tool ====
        this.mcpServer.tool(
            "getCodeFromEditor",
            "Retrieves the current code from the WebChucK editor",
            {},  // No input parameters needed
            async () => {
                try {
                    // Find active sessions
                    const activeSessions = Array.from(this.sessionsManager.entries());
                    if (activeSessions.length === 0) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "No active WebChucK sessions found. Please connect to the WebChucK client first."
                                }
                            ]
                        };
                    }

                    // Get the first active session or a named one if available
                    const activeSession: [string,Session] = activeSessions.find(([_, session]) =>
                        session.name && session.ws.readyState === WebSocket.OPEN
                    ) || activeSessions[0];

                    const sessionId = activeSession[0];
                    const session = activeSession[1];

                    if (session.ws.readyState !== WebSocket.OPEN) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "The WebChucK session is not currently connected."
                                }
                            ]
                        };
                    }

                    // Get the active code from the session
                    const code = session.activeCode || "";

                    if (!code.trim()) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "The editor is currently empty or no code has been executed yet."
                                }
                            ]
                        };
                    }

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Current code in the editor (Session ${session.name || sessionId}):\n\n\`\`\`chuck\n${code}\n\`\`\``
                            }
                        ]
                    };
                } catch (error) {
                    console.error("Error retrieving code from editor:", error);
                    return {
                        isError: true,
                        content: [
                            {
                                type: "text",
                                text: `Error retrieving code: ${error instanceof Error ? error.message : "Unknown error"}`
                            }
                        ]
                    };
                }
            }
        );

// ==== List Audio Files Tool ====
        this.mcpServer.tool("listAudioFiles",
            "Lists all available audio files that can be preloaded as samples. Use this first to identify samples to load with preloadSamples. Note that not all listed samples may load successfully.",
            {
                query: z.string().optional().describe("Optional search query to filter audio files")
            },
            async ({ query }) => {
                try {
                    let audioFiles: string[] = [];
                    let apiUrl = `${this.config.publicUrl}/api/audio`;

                    // Add search query if provided
                    if (query) {
                        apiUrl += `?q=${encodeURIComponent(query)}`;
                    }

                    const response = await fetch(apiUrl);

                    if (!response.ok) {
                        throw new Error(`HTTP error: ${response.status}`);
                    }

                    const data = await response.json();
                    audioFiles = data.files || [];

                    // Format the output with folder structure
                    const formattedOutput = audioFiles.length > 0
                        ? audioFiles.join('\n')
                        : query
                            ? `No audio files found matching '${query}'`
                            : "No audio files available";

                    const resultMessage = query
                        ? `Found ${audioFiles.length} audio files matching '${query}':`
                        : `Available audio files (${audioFiles.length}):`;

                    return {
                        content: [{
                            type: "text",
                            text: `${resultMessage}\n${formattedOutput}`
                        }]
                    };
                } catch (err) {
                    this.logger.error('Error listing audio files:', err);
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
        this.mcpServer.tool("getChucKSessions",
            "The webchuck.getChucKSessions tool lists all active WebChucK sessions and their unique identifiers, allowing multiple WebChucK clients to be used as an ensemble:\n" +
            "\n" +
            "* Call this tool if you don't have a session Id yet, or when you get a 404 error\n" +
            "* The tool returns the total number of active sessions and their respective session IDs\n" +
            "* Only one session can be addressed at a time through the tools, so interactions with multiple sessions require separate explicit tool calls",
            {},
            async () => {
                try {
                    const response = await fetch(`${this.config.publicUrl}/api/debug/sessions`);

                    if (!response.ok) {
                        throw new Error(`HTTP error: ${response.status}`);
                    }

                    const data = await response.json();

                    return {
                        content: [{
                            type: "text",
                            text: `Active WebChucK sessions: ${data.size}\n${
                                JSON.stringify(data.sessions, null, 2)
                            }`
                        }]
                    };
                    // const sessions = Array.from(this.sessionsManager.entries()).map(([id, session]) => ({
                    //     id,
                    //     name: session.name || 'Unnamed Session',
                    //     status: session.status || 'unknown',
                    //     connected: session.ws.readyState === WebSocket.OPEN
                    // }));
                    //
                    // const data = {
                    //     size: this.sessionsManager.size,
                    //     sessions: sessions,
                    //     cwd: this.working_directory,
                    // };
                    //
                    // return {
                    //     content: [{
                    //         type: "text",
                    //         text: `Active WebChucK sessions: ${sessions.length}\n${
                    //             JSON.stringify(data, null, 2)}')
                    //         }`
                    //     }]
                    // };
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

// ==== Preload Samples Tool ====
        this.mcpServer.tool("preloadSamples",
            "Load sample samples before using them in your composition. This is critical for sample-based music:\n" +
            "\n" +
            "* First use listAudioFiles to see all available samples\n" +
            "* Then select samples you want to use (choose ALL at once - samples aren't loaded additively)\n" +
            "* Call preloadSamples with an array of all your chosen samples\n" +
            "* Check debugSessions after preloading to confirm which samples loaded successfully\n" +
            "* Use ONLY samples that appear in the debugSessions results\n" +
            "* When playing samples, use the exact virtualFilenames provided in the debugSessions output\n" +
            "* If samples don't show up in debugSessions results, try different samples",
            {
                samples: z.array(z.string()).describe("Array of sample names to preload"),
                sessionId: z.string().describe("Session ID for an existing WebChucK session")
            },
            async ({samples, sessionId}) => {
                try {
                    // The issue: code is being sent with extra wrapping
                    // Just send the raw samples array directly

                    const response = await fetch(`${this.config.publicUrl}/api/preload`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            samples,
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
                            text: `Error preloading samples: ${errorMessage}`
                        }]
                    };
                }
            }
        );

        this.mcpServer.tool("playWithSamples",
            "A convenience function that combines preloading samples and executing code in one step. This is useful for creating compositions that immediately use the loaded samples:\n" +
            "\n" +
            "* Handles both preloading the specified samples and executing the provided ChucK code\n" +
            "* More efficient than calling preloadSamples and executeChucK separately\n" +
            "* Still requires checking debugSessions afterward to verify which samples loaded successfully\n" +
            "* If you need to know exactly which samples loaded before writing your code, use the separate preloadSamples approach instead\n" +
            "* Remember that samples aren't loaded additively - specify all samples you need in a single call\n" +
            "\n" +
            "This tool can streamline your workflow if you know exactly which samples you want to use, but it's less flexible if you need to check which samples successfully loaded before finalizing your composition.",
            {
                code: z.string().describe("The ChucK code to execute"),
                samples: z.array(z.string()).describe("Array of sample names to preload before execution"),
                sessionId: z.string().describe("Session ID for an existing WebChucK session")
            },
            async ({ code, samples, sessionId }) => {
                try {
                    // First preload the samples
                    const preloadResponse = await fetch(`${this.config.publicUrl}/api/preload`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            samples,
                            sessionId
                        }),
                    });

                    if (!preloadResponse.ok) {
                        throw new Error(`Preload error: ${preloadResponse.status}`);
                    }

                    // Wait a moment for preloading to complete
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Then execute the code
                    const executeResponse = await fetch(`${this.config.publicUrl}/api/execute`, {
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
                            text: `Preloaded samples (${samples.join(', ')}) and started execution: ${data.message || "Code running"}`
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


        this.mcpServer.tool("debugExecutions",
            "Provides detailed information about ChucK code execution results. Use this after calling executeChucK to:\n" +
            "\n" +
            "* Check for syntax errors in your ChucK code\n" +
            "* View error messages with line numbers and column positions\n" +
            "* Identify runtime issues like invalid operations or type mismatches\n" +
            "* Verify if your code executed successfully\n" +
            "\n" +
            "Always call this after executeChucK to ensure your code is running correctly. Error messages include line numbers to help pinpoint issues in complex code.",
            {
                sessionId: z.string().describe("Session ID for the WebChucK session to check for execution errors.")
            },
            async ({sessionId}) => {
                try {
                    // Check if sessionId is provided, if not, return an error message
                    if (!sessionId) {
                        return {
                            content: [{
                                type: "text",
                                text: "Error: Session ID is required. Please provide the sessionId parameter."
                            }]
                        };
                    }

                    const response = await fetch(`${this.config.publicUrl}/api/debug/execution/${sessionId}`);

                    if (!response.ok) {
                        throw new Error(`HTTP error: ${response.status}`);
                    }

                    const errorInfo = await response.json();

                    // // Get execution error from session debug info
                    // const errorInfo = session.debugInfo.lastExecutionError || "No execution error recorded for this session.";
                    const name = errorInfo.name || 'Unnamed Session';

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(errorInfo)
                        }]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error(errorMessage)
                    return {
                        content: [{
                            type: "text",
                            text: `Error fetching debug data : ${errorMessage}`
                        }]
                    };
                }
            });

        this.mcpServer.tool("debugPreload",
            "Shows detailed results of sample preloading operations. Use this after preloadSamples to:\n" +
            "\n" +
            "* Confirm which specific sample samples loaded successfully\n" +
            "* Get the exact virtualFilenames required for playing samples\n" +
            "* Identify any samples that failed to load\n" +
            "* Ensure you have all necessary sounds before composing\n" +
            "\n" +
            "This is critical for sample-based compositions - only use the virtualFilenames that appear in these results. If an sample doesn't appear here after preloading, you'll need to choose alternative samples.\n" +
            "The results show the complete mapping between server files and virtual filenames you'll use in your code. Always reference the exact virtualFilenames (e.g., \"audio_files_Waves_FluidR3_GM_choir_aahs_C3.wav\") when playing samples, not the general sample names.",
            {
                sessionId: z.string().describe("Session ID for the WebChucK session to check for preload results.")
            },
            async ({sessionId}) => {
                try {
                    // Check if sessionId is provided, if not, return an error message
                    if (!sessionId) {
                        return {
                            content: [{
                                type: "text",
                                text: "Error: Session ID is required. Please provide the sessionId parameter."
                            }]
                        };
                    }

                    // Fetch session-specific preload data
                    const session = this.sessionsManager.get(sessionId);
                    if (!session) {
                        return {
                            content: [{
                                type: "text",
                                text: `Error: Session ID ${sessionId} not found.`
                            }]
                        };
                    }

                    // Get preload info from session debug info
                    const preloadInfo = session.debugInfo.lastPreloadResult || "No preload result recorded for this session.";
                    const name = session.name || 'Unnamed Session';

                    // Format the preload info nicely
                    const resultText = typeof preloadInfo === 'object'
                        ? JSON.stringify(preloadInfo, null, 2)
                        : preloadInfo.toString();

                    return {
                        content: [{
                            type: "text",
                            text: `Preload Results for ${sessionId} (${name}):\n${resultText}`
                        }]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error(errorMessage)
                    return {
                        content: [{
                            type: "text",
                            text: `Error fetching debug data : ${errorMessage}`
                        }]
                    };
                }
            });


        this.mcpServer.tool("debugSessions",
            "Shows general information about active WebChucK sessions. Use this to:\n" +
            "\n" +
            "* View all active session IDs and their status\n" +
            "* Check the overall health of the ChucK environment\n" +
            "* Identify the working directory of sessions\n",
            {},
            async () => {
                try {

                    // Create a list of sessions with relevant information
                    const sessions = Array.from(this.sessionsManager.entries() as Iterable<[any, any]>).map(([id, session]) => ({
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

                    return {
                        content: [{
                            type: "text",
                            text: `Session Data: ${JSON.stringify(sessionInfo, null, 2)}\n\n` +
                                `Active Sessions: ${this.sessionsManager.size}\n` +
                                sessions.map(s => `${s.id} (${s.name}) - ${s.status} (${s.connected ? 'connected' : 'disconnected'})`).join('\n')
                        }]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error(errorMessage)
                    return {
                        content: [{
                            type: "text",
                            text: `Error fetching debug data : ${errorMessage}`
                        }]
                    };
                }
            });

// ==== Create Dynamic Resource for Sample Families ====
// this.mcpServer.resource(
//     "sampleFamily",
//     new ResourceTemplate("sample-family://{name}", {
//         list: async () => {
//             const families = [
//                 {name: "piano", description: "Piano samples"},
//                 {name: "guitar", description: "Guitar samples"},
//                 {name: "strings", description: "String samples"},
//                 {name: "brass", description: "Brass samples"},
//                 {name: "woodwind", description: "Woodwind samples"},
//                 {name: "percussion", description: "Percussion samples"},
//                 {name: "synth", description: "Synthesizer sounds"}
//             ];
//             return {
//                 resources: families.map(family => ({
//                     name: family.name,
//                     uri: `sample-family://${family.name}`
//                 }))
//             };
//         }
//     }),
//     async (uri, {name}) => {
//         // Map of sample family to specific directories to preload
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
//         const samples = familyMap[name] || [];
//
//         if (samples.length === 0) {
//             return {
//                 contents: [{
//                     uri: uri.href,
//                     text: `# Sample Family: ${name}
// No specific samples defined for this family.
// Please try another family or preload specific samples directly.`
//                 }]
//             };
//         }
//
//         return {
//             contents: [{
//                 uri: uri.href,
//                 text: `# Sample Family: ${name}
// This family includes the following samples:
// ${samples.map(i => `- ${i}`).join('\n')}
//
// To preload these samples before playing music, use the preloadSamples tool:
//
// \`\`\`
// preloadSamples(samples: ${JSON.stringify(samples)})
// \`\`\`
//
// After preloading, you can use these samples in your ChucK code.`
//             }]
//         };
//     }
// );

// ==== Create dynamic resource for audio files ====
        this.mcpServer.resource(
            "audioFile",
            new ResourceTemplate("audio://{filename}", {
                list:
                    async () => {
                        try {
                            const files = fs.readdirSync(this.audioService.audioDir).filter(file =>
                                file.endsWith('.wav') || file.endsWith('.aiff')
                            );
                            return {
                                resources: files.map(filename => ({
                                    name: filename,
                                    uri: `audio://${filename}`
                                }))
                            };
                        } catch (error) {
                            this.logger.error('Error listing audio files for MCP resource:', error);
                            return {resources: []};
                        }
                    }
            }),
            async (uri, {filename}) => {
                const filepath = path.join(this.audioService.audioDir, filename.toString());

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
                    this.logger.error(`Error accessing audio file ${filename}:`, error);
                    return {
                        contents: [{
                            uri: uri.href,
                            text: `Error accessing audio file: ${error}`
                        }]
                    };
                }
            }
        );

// ==== Play From Library Tool ====
        this.mcpServer.tool("playFromLibrary",
            "Plays a saved code snippet from the client's library. This allows you to save and reuse ChucK code snippets across sessions. To see available snippets, ask the user to check their code library.",
            {
                name: z.string().describe("Name of the snippet to load and play from the library"),
                sessionId: z.string().describe("Session ID for an existing WebChucK session")
            },
            async ({ name, sessionId }) => {
                try {
                    // Validate parameters
                    if (!name) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "Error: Snippet name is required"
                                }
                            ]
                        };
                    }

                    const session = this.sessionsManager.get(sessionId);
                    if (!session) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Error: Session ${sessionId} not found`
                                }
                            ]
                        };
                    }

                    // Send a message to the client to play from library
                    session.ws.send(JSON.stringify({
                        type: 'play_from_library',
                        name: name
                    }));

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Request sent to play snippet "${name}" from library`
                            }
                        ]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error('Error playing from library:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error playing from library: ${errorMessage}`
                            }
                        ]
                    };
                }
            }
        );

// ==== Create Dynamic Resource for ChucK Examples ====
        this.mcpServer.resource(
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

        this.mcpServer.prompt("syntax.reminder",
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
   - Attempt to load ALL samples at once with preloadSamples as incremental loading is experimental
   - Use debugPreload to verify which samples actually loaded
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
   - Don't assume samples loaded successfully without checking debugPreload
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

        this.mcpServer.prompt("demo",
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

### Building Your Sample Arsenal

Create at least these core samples:

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

        this.mcpServer.prompt("assistant.guide",
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
    }
}