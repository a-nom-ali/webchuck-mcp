import {Logger} from "../../utils/logger.js";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {SessionsManager, Session} from "../sessionsManager.js";
import {z} from "zod";
import {dbRun, dbAll, dbGet} from "../DB/dbManager.js";

// Middleware for error handling
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};

export class SnippetTools {
    constructor(
        private mcpServer: McpServer,
        private sessionsManager: SessionsManager,
        private logger: Logger
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

        // Get all snippets with optional filtering
        this.mcpServer.tool("getSnippets",
            "Get all ChucK snippets with optional filtering",
            {
                tag: z.string().describe("Search by tag"),
                search: z.string().describe("Search query")
            },
            async ({tag, search}) => {
                try {
                    let sql = 'SELECT s.* FROM ChuckSnippets s';
                    const params = [];

                    if (tag) {
                        sql += ' JOIN SnippetTags t ON s.id = t.snippet_id WHERE t.tag = ?';
                        params.push(tag);
                    }

                    if (search && !tag) {
                        sql += ' WHERE (s.name LIKE ? OR s.description LIKE ?)';
                        params.push(`%${search}%`, `%${search}%`);
                    } else if (search) {
                        sql += ' AND (s.name LIKE ? OR s.description LIKE ?)';
                        params.push(`%${search}%`, `%${search}%`);
                    }

                    sql += ' ORDER BY s.updated_at DESC';

                    const snippets:any = await dbAll(sql, params);

                    // For each snippet, get its tags
                    for (const snippet of snippets) {
                        const tags:any = await dbAll(
                            'SELECT tag FROM SnippetTags WHERE snippet_id = ?',
                            [snippet.id]
                        );
                        snippet.tags = tags.map((t: { tag: string }) => t.tag);
                    }
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(snippets)
                            }
                        ]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error('Error finding snippets:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error finding snippets: ${errorMessage}`
                            }
                        ]
                    };
                }
            });

// Get a specific snippet by ID
        this.mcpServer.tool("getSnippetById",
            "Get a specific ChucK snippet by ID",
            {
                id: z.number().describe("Id of the snippet to load")
            },
            async ({id}) => {
                try {

                    const snippet:any = await dbGet('SELECT * FROM ChuckSnippets WHERE id = ?', [id]);

                    if (!snippet) {
                        throw {error: 'Snippet not found'};
                    }

                    const tags:any = await dbAll(
                        'SELECT tag FROM SnippetTags WHERE snippet_id = ?',
                        [id]
                    );

                    snippet.tags = tags.map((t: { tag: string }) => t.tag);

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(snippet)
                            }
                        ]
                    };

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error('Error getting snippet:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error getting snippet: ${errorMessage}`
                            }
                        ]
                    };
                }
            });

// Create a new snippet
        this.mcpServer.tool("saveSnippet",
            "Create a new snippet",
            {
                name: z.string().describe("Snippet name"),
                code: z.string().describe("Code Snippet"),
                description: z.string().describe("Description"),
                tags: z.array(
                    z.string().describe("Relevant tags")
                ),
            },
            async ({name, code, description, tags = []}) => {
                try {

                    if (!name || !code) {
                        throw {error: 'Name and code are required'};
                    }

                    const existing = await dbGet('SELECT id FROM ChuckSnippets WHERE name = ?', [name]);
                    if (existing) {
                        throw {error: 'A snippet with this name already exists'};
                    }

                    const timestamp = new Date().toISOString();

                    const result:any = await dbRun(
                        'INSERT INTO ChuckSnippets (name, code, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                        [name, code, description, timestamp, timestamp]
                    );

                    const snippetId = result.id;

                    // Add tags if provided
                    for (const tag of tags) {
                        await dbRun(
                            'INSERT INTO SnippetTags (snippet_id, tag) VALUES (?, ?)',
                            [snippetId, tag]
                        );
                    }

                    const newSnippet:any = await dbGet('SELECT * FROM ChuckSnippets WHERE id = ?', [snippetId]);
                    newSnippet.tags = tags;

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(newSnippet)
                            }
                        ]
                    };

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error('Error saving snippets:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error saving snippets: ${errorMessage}`
                            }
                        ]
                    };
                }
            });

// Update an existing snippet
        this.mcpServer.tool("updateSnippet",
            "Update a specific ChucK snippet by ID",
            {
                id: z.number().describe("Id of the snippet to update"),
                name: z.string().describe("Snippet name"),
                code: z.string().describe("Code Snippet"),
                description: z.string().describe("Description"),
                tags: z.array(
                    z.string().describe("Relevant tags")
                ),
            },
            async ({id, name, code, description, tags}) => {
                try {

                    // Check if snippet exists
                    const snippet:any = await dbGet('SELECT * FROM ChuckSnippets WHERE id = ?', [id]);
                    if (!snippet) {
                        throw {error: 'Snippet not found'};
                    }

                    // If name is changing, check if new name is available
                    if (name && name !== snippet.name) {
                        const existing = await dbGet('SELECT id FROM ChuckSnippets WHERE name = ?', [name]);
                        if (existing) {
                            throw {error: 'A snippet with this name already exists'};
                        }
                    }

                    const updates = [];
                    const params = [];

                    if (name) {
                        updates.push('name = ?');
                        params.push(name);
                    }

                    if (code) {
                        updates.push('code = ?');
                        params.push(code);
                    }

                    if (description !== undefined) {
                        updates.push('description = ?');
                        params.push(description);
                    }

                    updates.push('updated_at = ?');
                    params.push(new Date().toISOString());

                    params.push(id);

                    if (updates.length > 0) {
                        await dbRun(
                            `UPDATE ChuckSnippets
                             SET ${updates.join(', ')}
                             WHERE id = ?`,
                            params
                        );
                    }

                    // Update tags if provided
                    if (Array.isArray(tags)) {
                        // Delete all existing tags
                        await dbRun('DELETE FROM SnippetTags WHERE snippet_id = ?', [id]);

                        // Add new tags
                        for (const tag of tags) {
                            await dbRun(
                                'INSERT INTO SnippetTags (snippet_id, tag) VALUES (?, ?)',
                                [id, tag]
                            );
                        }
                    }

                    const updatedSnippet:any = await dbGet('SELECT * FROM ChuckSnippets WHERE id = ?', [id]);
                    const updatedTags:any = await dbAll('SELECT tag FROM SnippetTags WHERE snippet_id = ?', [id]);
                    updatedSnippet.tags = updatedTags.map((t: { tag: string }) => t.tag);

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(updatedSnippet)
                            }
                        ]
                    };

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error('Error updating snippets:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error updating snippets: ${errorMessage}`
                            }
                        ]
                    };
                }
            });


// Delete a snippet
        this.mcpServer.tool("deleteSnippet",
            "Delete a snippet by ID",
            {
                id: z.number().describe("Id of the snippet to delete")
            },
            async ({id}) => {
                try {
                    // Check if snippet exists
                    const snippet = await dbGet('SELECT * FROM ChuckSnippets WHERE id = ?', [id]);
                    if (!snippet) {
                        throw {error: 'Snippet not found'};
                    }

                    // Delete tags first (due to foreign key constraint)
                    await dbRun('DELETE FROM SnippetTags WHERE snippet_id = ?', [id]);

                    // Delete the snippet
                    await dbRun('DELETE FROM ChuckSnippets WHERE id = ?', [id]);

                    return {
                        content: [
                            {
                                type: "text",
                                text: "true"
                            }
                        ]
                    };

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error('Error deleting snippets:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error deleting snippets: ${errorMessage}`
                            }
                        ]
                    };
                }
            });

// Execute a snippet
        this.mcpServer.tool("executeSnippet",
            "Execute a snippet by ID",
            {
                id: z.number().describe("Id of the snippet to delete"),
                sessionId: z.string().describe("Session ID for an existing WebChucK session")
            },
            async ({id, sessionId}) => {
            try {

                if (!sessionId) {
                    throw {error: 'ChucK session ID is required'};
                }

                const session = this.sessionsManager.get(sessionId);
                if (!session) {
                    throw {error: 'Session not found'};
                }

                const snippet:any = await dbGet('SELECT code FROM ChuckSnippets WHERE id = ?', [id]);
                if (!snippet) {
                    throw {error: 'Snippet not found'};
                }

                // Store the active code
                session.activeCode = snippet;
                session.status = 'executing';

                // Send code to WebChucK client
                session.ws.send(JSON.stringify({
                    type: 'execute_code',
                    code: snippet
                }));

                return {
                    content: [
                        {
                            type: "text",
                            text: "Code execution started"
                        }
                    ]
                };

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error('Error executing snippets:', error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error executing snippets: ${errorMessage}`
                        }
                    ]
                };
            }
        });
    }
}