import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";

export class CombinedTools {
    constructor(
        private mcpServer: McpServer,
        private port: any,
    ) {
        this.configureTools();
    }

    private configureTools(): void {
        this.mcpServer.tool("getParameterValue",
            "A convenience function to get the current value for a parameter in a running WebChucK session",
            {
                paramName: z.string().describe("The Parameter Name (identifier)"),
                sessionId: z.string().describe("Session ID for an existing WebChucK session")
            },
            async ({paramName, sessionId}) => {
                try {
                    // First preload the samples
                    const response = await fetch(`https://localhost:${this.port}/api/parameter${paramName}`, {
                        method: 'GET',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            sessionId
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`Parameter Get error: ${response.status}`);
                    }

                    const data = await response.json();

                    return {
                        content: [{
                            type: "text",
                            text: data.value || null
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

        this.mcpServer.tool("setParameterValue",
            "A convenience function to set the current value for a parameter in a running WebChucK session",
            {
                paramName: z.string().describe("The Parameter Name (identifier)"),
                paramValue: z.string().describe("The new Parameter Value to assign"),
                tween: z.boolean().describe("Whether to tween the value or set it to the exact value immediately."),
                sessionId: z.string().describe("Session ID for an existing WebChucK session")
            },
            async ({paramName, paramValue, tween, sessionId}) => {
                try {
                    const response = await fetch(`https://localhost:${this.port}/api/parameter${paramName}`, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            paramName,
                            paramValue,
                            tween,
                            sessionId
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`Parameter Set error: ${response.status}`);
                    }

                    const data = await response.json();

                    return {
                        content: [{
                            type: "text",
                            text: data.value || null
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
    }
}