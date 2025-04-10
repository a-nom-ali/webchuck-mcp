import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import WebSocket from "ws";
import {SessionsManager} from "../sessionsManager.js";

export class ParameterTools {
    constructor(
        private mcpServer: McpServer,
        private sessionsManager: SessionsManager,
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
                    if (this.sessionsManager)
                    {
                        const session = this.sessionsManager.get(sessionId);

                        if (session) {
                            session.ws.send(JSON.stringify({
                                type: 'get_parameter_value',
                                payload: {
                                    name: paramName,
                                    sessionId
                                }
                            }));

                            // Wait a moment for the client to respond
                            await new Promise(resolve => setTimeout(resolve, 200));

                            const value = this.sessionsManager.getParameter(sessionId, paramName);

                            return {
                                content: [{
                                    type: "text",
                                    text: value.toString()
                                }]
                            }
                        }
                    }

                    // First preload the samples
                    const response = await fetch(`https://localhost:${this.port}/api/parameter/${paramName}?sessionId=${sessionId}`);

                    if (!response.ok) {
                        throw new Error(`Parameter Get error: ${response.status}`);
                    }

                    const data = await response.json();

                    return {
                        content: [{
                            type: "text",
                            text: data.value.toString()
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
                tween: z.number().describe("Time to tween between the old and new value, 0 sets it to the exact value immediately."),
                sessionId: z.string().describe("Session ID for an existing WebChucK session")
            },
            async ({paramName, paramValue, tween, sessionId}) => {
                try {
                    if (this.sessionsManager)
                    {
                        const session = this.sessionsManager.get(sessionId);

                        if (session) {
                            session.ws.send(JSON.stringify({
                                type: 'set_parameter_value',
                                payload: {
                                    name: paramName,
                                    value: paramValue,
                                    tween,
                                    sessionId
                                }
                            }));

                            // Wait a moment for the client to respond
                            await new Promise(resolve => setTimeout(resolve, 200));

                            const value = this.sessionsManager.getParameter(sessionId, paramName);

                            return {
                                content: [{
                                    type: "text",
                                    text: value.toString()
                                }]
                            }
                        }
                    }

                    const response = await fetch(`https://localhost:${this.port}/api/parameter/${paramName}`, {
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
                            text: data.value.toString() || null
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