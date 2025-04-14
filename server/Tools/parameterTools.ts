// Pseudocode:
// 1. Change the input schema for both tools to accept an array "parameters" of parameter objects.
// 2. For getParameterValue:
//    a. Loop over each parameter object in the array.
//    b. Attempt to find the session using sessionId provided in each parameter.
//    c. If found, send a WebSocket message and wait briefly, then retrieve the parameter value.
//    d. Otherwise, perform a fetch call to get the parameter value.
//    e. Collect all responses (value or error text) in an array.
//    f. Return a unified content that concatenates all responses.
// 3. For setParameterValue:
//    a. Loop over each parameter object in the array.
//    b. Attempt to find the session using sessionId provided.
//    c. If found, send a WebSocket message to set the parameter and wait, then retrieve the updated value.
//    d. Otherwise, perform a fetch call with PUT method to set the parameter.
//    e. Collect all responses in an array.
//    f. Return a unified content that concatenates all responses.

import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import WebSocket from "ws";
import {SessionsManager} from "../sessionsManager.js";
import {Logger} from "../../utils/logger.js";

export class ParameterTools {
    constructor(
        private mcpServer: McpServer,
        private sessionsManager: SessionsManager,
        private logger: Logger,
        private port: any,
    ) {
        this.configureTools();
    }

    private configureTools(): void {
        this.mcpServer.tool(
            "getParameterValue",
            "A convenience function to get the current value for one or more parameters in a running WebChucK session",
            {
                payload: z.array(
                    z.object({
                        parameters: z.array(
                            z.string().describe("The Parameter Name (identifier)")
                        ).describe("The List of Parameter Name(s), return all if empty"),
                        sessionId: z.string().describe("Session ID for an existing WebChucK session")
                    })
                )
            },
            async ({payload}) => {
                const messages: any[] = [];
                if (payload.length > 0)
                {
                    for (const {parameters, sessionId} of payload) {
                        try {
                            const sessionMessages: any[] = [];
                            if (this.sessionsManager) {
                                let session = this.sessionsManager.get(sessionId);
                                if (session) {
                                    if (session.ws.readyState === WebSocket.OPEN) {
                                        session.ws.send(JSON.stringify({
                                            type: 'get_parameter_value',
                                            payload: parameters
                                        }));

                                        await new Promise(resolve => setTimeout(resolve, (
                                            parameters.length > 0
                                                ? 15 * parameters.length
                                                : 500
                                        )));

                                        if (parameters.length > 0){
                                            parameters.forEach((parameter:string) => {
                                                this.logger.info(parameter);
                                                const value = this.sessionsManager.getParameter(sessionId, parameter);
                                                sessionMessages.push({
                                                    name: parameter,
                                                    value
                                                });
                                            });
                                        }
                                        else {
                                            const allParameters = this.sessionsManager.getAllParameters(sessionId);
                                            this.logger.info("JSON.stringify(allParameters)");
                                            this.logger.info(typeof allParameters);
                                            this.logger.info(JSON.stringify(allParameters));
                                            if (allParameters)
                                                Object.keys(allParameters).filter(key => key !== "undefined").forEach((parameter:any) => {
                                                    sessionMessages.push({
                                                        name: parameter,
                                                        value: allParameters[parameter]
                                                    });
                                                });

                                        }

                                        messages.push(sessionMessages);
                                    }
                                    else {
                                        throw new Error("Socket not open.")
                                    }
                                }
                                else {
                                    throw new Error("No session found.")
                                }
                            }
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            messages.push(`Parameter Error (${sessionId}): ${errorMessage}\n${parameters}`);
                        }
                    }
                }
                return {
                    content: messages.map(sessionMessages => ({
                        type: "text",
                        text: JSON.stringify(sessionMessages)}))
                };
            }
        );

        this.mcpServer.tool(
            "setParameterValue",
            "A convenience function to set the current value for one or more parameters in a running WebChucK session",
            {
                payload: z.array(
                    z.object({
                        parameters: z.array(
                            z.object({
                                name: z.string().describe("The Parameter Name (identifier)"),
                                value: z.string().describe("The new Parameter Value to assign"),
                                tween: z.number().optional().describe("Time in seconds to tween between the old and new value, 0 sets it immediately."),
                                delay: z.number().optional().describe("Time in seconds Delay before tweening or setting value, 0 sets it immediately."),
                            })
                        ).describe("The List of Parameter Name(s), Parameter Value(s), tween, and delay values"),
                        sessionId: z.string().describe("Session ID for an existing WebChucK session")
                    })
                )
            },
            async ({payload}) => {
                const messages: any[] = [];
                for (const {parameters, sessionId} of payload) {
                    try {
                        if (this.sessionsManager) {
                            const sessionMessages: any[] = [];
                            let session = this.sessionsManager.get(sessionId);
                            if (session) {
                                session.ws.send(JSON.stringify({
                                    type: 'set_parameter_value',
                                    payload: parameters
                                }));
                                await new Promise(resolve => setTimeout(resolve, 15 * (
                                    parameters.length > 0
                                        ? parameters.length
                                        : 15
                                )));

                                //Maybe we need a new reference?
                                session = this.sessionsManager.get(sessionId);

                                parameters.forEach((parameter:any) => {
                                    const value = this.sessionsManager.getParameter(sessionId, parameter.name);
                                    sessionMessages.push({
                                        name: parameter.name,
                                        value
                                    });
                                });
                                messages.push(sessionMessages);
                            }
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        messages.push(`Parameter Error (${sessionId}): ${errorMessage}\n${parameters}`);
                    }
                }
                return {
                    content: messages.map(sessionMessages => ({
                        type: "text",
                        text: JSON.stringify(sessionMessages)}))
                };
            }
        );
    }
}
