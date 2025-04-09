import {Logger} from "../../utils/logger.js";
import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";
import {SessionsManager, Session} from "../sessionsManager.js";
import {z} from "zod";

export class SessionTools {
    constructor(
        private mcpServer: McpServer,
        private sessionsManager: SessionsManager,
        private logger: Logger,
        private port: any,
        private working_directory: string
    ) {
        this.configureTools();
    }

    private configureTools(): void {
// ==== Get Active Sessions Tool ====
        this.mcpServer.tool("getSessionStatus",
            "The webchuck.getSessionStatus tool returns the status of a session queried by the unique sessionId",
            {
                sessionId: z.string().describe("Session ID for an existing WebChucK session")
            },
            async (sessionId) => {
                try {
                    const response = await fetch(`https://localhost:${this.port}/api/session/${sessionId}`);

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
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    return {
                        content: [{
                            type: "text",
                            text: `Error getting session: ${errorMessage}`
                        }]
                    };
                }
            }
        );

// ==== Get Active Sessions Tool ====
        this.mcpServer.tool("getSessions",
            "The webchuck.getSessions tool lists all active WebChucK sessions and their unique identifiers, allowing multiple WebChucK clients to be used as an ensemble:\n" +
            "\n" +
            "* Call this tool if you don't have a session Id yet, or when you get a 404 error\n" +
            "* The tool returns the total number of active sessions and their respective session IDs\n" +
            "* Only one session can be addressed at a time through the tools, so interactions with multiple sessions require separate explicit tool calls",
            {},
            async () => {
                try {
                    const response = await fetch(`https://localhost:${this.port}/api/debug/sessions`);

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
                        cwd: this.working_directory,
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
    }
}