import {Logger} from "../../utils/logger.js";
import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";
import {SessionsManager, Session} from "../sessionsManager.js";
import {AudioService} from "../audioService.js";
import {z} from "zod";
import fs from "fs";
import path from "path";

export class SampleTools {
    constructor(
        private mcpServer: McpServer,
        private sessionsManager: SessionsManager,
        private audioService: AudioService,
        private logger: Logger,
        private port: any,
        private working_directory: string
    ) {
        this.configureTools();
    }

    private configureTools(): void {

// ==== List Audio File Keywords Tool ====
        this.mcpServer.tool("listAvailableAudioFileKeywords",
            "Lists all available audio file keywords that can be used to search for specific sample families. Use this first to identify sample families available for listAudioFiles or preloadSamples.",
            {
            },
            async () => {
                try {
                    let apiUrl = `https://localhost:${this.port}/api/search/keywords`;

                    const response = await fetch(apiUrl);

                    if (!response.ok) {
                        throw new Error(`HTTP error: ${response.status}`);
                    }

                    const data = await response.json();

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(data)
                        }]
                    };
                } catch (err) {
                    this.logger.error('Error listing keywords:', err);
                    return {
                        content: [{
                            type: "text",
                            text: `Error listing keywords: ${err}`
                        }]
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
                    let apiUrl = `https://localhost:${this.port}/api/audio`;

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

                    const response = await fetch(`https://localhost:${this.port}/api/preload`, {
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

                    const response = await fetch(`https://localhost:${this.port}/api/debug/preload/${sessionId}`);

                    if (!response.ok) {
                        throw new Error(`HTTP error: ${response.status}`);
                    }

                    const preloadInfo = await response.json();

                    // // Get execution error from session debug info
                    // const errorInfo = session.debugInfo.lastExecutionError || "No execution error recorded for this session.";
                    const name = preloadInfo.name || 'Unnamed Session';

                    return {
                        content: [{
                            type: "text",
                            text: `Preload Results for ${sessionId} (${name}):\n` +
                                JSON.stringify(preloadInfo)
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
    }
}