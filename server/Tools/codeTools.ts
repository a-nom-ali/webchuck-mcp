import {Logger} from "../../utils/logger.js";
import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";
import {SessionsManager, Session} from "../sessionsManager.js";
import {AudioService} from "../audioService.js";
import {z} from "zod";
import fs from "fs";
import path from "path";

export class CodeTools {
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
                sessionId: z.string().describe("Session ID for an existing WebChucK session - obtain this from getSessions")
            },
            async ({code, sessionId}) => {
                try {
                    // The issue: code is being sent with extra wrapping
                    // Just send the raw code string directly

                    const response = await fetch(`https://localhost:${this.port}/api/execute`, {
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
                    const response = await fetch(`https://localhost:${this.port}/api/stop`, {
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
                    const activeSession: [string, Session] = activeSessions.find(([_, session]) =>
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

                    const response = await fetch(`https://localhost:${this.port}/api/debug/execution/${sessionId}`);

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
    }
}