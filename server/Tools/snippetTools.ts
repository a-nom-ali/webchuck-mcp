import {Logger} from "../../utils/logger.js";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {SessionsManager, Session} from "../sessionsManager.js";
import {z} from "zod";

export class SnippetTools {
    constructor(
        private mcpServer: McpServer,
        private sessionsManager: SessionsManager,
        private logger: Logger,
        private working_directory: string
    ) {
        this.configureTools();
    }

    private configureTools(): void {

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
   }
}