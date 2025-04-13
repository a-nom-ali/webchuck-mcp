import {Logger} from "../../utils/logger.js";
import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";
import {SessionsManager, Session} from "../sessionsManager.js";
import {AudioService} from "../audioService.js";
import {z} from "zod";
import WebSocket from "ws";

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

        // ==== Patch and Execute ChucK Code Tool ====
        this.mcpServer.tool("executePatch",
            "This handy debugging tool allows you to target specific ranges of current code to be patched when debugging ChucK code, then executes the updated ChucK code in a WebChucK session.",
            {
                code: z.string().describe("The ChucK code patch to execute - MUST follow ChucK language syntax - no C or C++ syntax!"),
                fromLine: z.number().describe("Int value of the starting line of the code to be replaced by the patch"),
                toLine: z.number().describe("Int value of the last line of the code to be replaced by the patch"),
                sessionId: z.string().describe("Session ID for an existing WebChucK session - obtain this from getSessions")
            },
            async ({code, fromLine, toLine, sessionId}) => {
                try {

                    const response = await fetch(`https://localhost:${this.port}/api/patch`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            // Just pass the code directly, don't wrap it further
                            code,
                            fromLine,
                            toLine,
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
                            text: `Error executing ChucK code patch: ${errorMessage}`
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
            {
                sessionId: z.string().describe("Session ID for an existing WebChucK session")
            },
            async ({sessionId}) => {
                try {
                    let code = `No code available`;
                    if (this.sessionsManager) {
                        const session:Session | undefined = this.sessionsManager.get(sessionId);
                        if (session) {
                            if (session.ws.readyState === WebSocket.OPEN) {
                                session.ws.send(JSON.stringify({
                                    type: 'get_code_from_editor'
                                }));

                                await new Promise(resolve => setTimeout(resolve, 500));

                                code = session.activeCode || "";

                                if (!code && !code.trim()) {
                                    code = "The editor is currently empty or no code has been executed yet.";
                                }
                                else {
                                    code = `Current code in the editor (Session ${session.name || sessionId}):\n\n\`\`\`chuck\n${code}\n\`\`\``
                                }
                            } else {
                                code = `The WebChucK session is not currently connected. ${session.ws.readyState} ${JSON.stringify(session)}}`;
                            }
                        }
                        else {
                            code = "No such session found."
                        }
                    }
                    else {
                        const response = await fetch(`https://localhost:${this.port}/api/snippet/editor/${sessionId}`);

                        if (!response.ok) {
                            throw new Error(`HTTP error: ${response.status}`);
                        }

                        code = await response.text();
                    }

                    return {
                        content: [
                            {
                                type: "text",
                                text: code
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
                                text: `Tool Error retrieving code: ${error instanceof Error ? error.message : "Unknown error"}`
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