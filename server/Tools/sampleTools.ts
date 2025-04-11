import {Logger} from "../../utils/logger.js";
import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";
import {SessionsManager, Session} from "../sessionsManager.js";
import {AudioService} from "../audioService.js";
import {z} from "zod";
import fs from "fs";
import path from "path";
import {dbAll, dbGet, dbRun} from "../DB/dbManager.js";
import {promisify} from "util";
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);

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
            {},
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
            async ({query}) => {
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

        // Get all samples with optional filtering
        this.mcpServer.tool("listSamples",
            "Get all samples with optional filtering",
            {
                volume_id: z.number().describe("Id of the samples volume"),
                tag: z.string().describe("Tag to search on"),
                search: z.string().describe("Search query"),
                limit: z.number().describe("Search result page size"),
                offset: z.number().describe("Search result page offset"),
            },
            async ({volume_id, tag, search, limit = 100, offset = 0}) => {
                try {

                    let sql = 'SELECT s.* FROM Samples s';
                    const params = [];

                    const conditions = [];

                    if (volume_id) {
                        conditions.push('s.volume_id = ?');
                        params.push(volume_id);
                    }

                    if (tag) {
                        sql += ' JOIN SampleTags t ON s.id = t.sample_id';
                        conditions.push('t.tag = ?');
                        params.push(tag);
                    }

                    if (search) {
                        conditions.push('(s.relative_path LIKE ? OR s.filename LIKE ?)');
                        params.push(`%${search}%`, `%${search}%`);
                    }

                    if (conditions.length > 0) {
                        sql += ' WHERE ' + conditions.join(' AND ');
                    }

                    sql += ' ORDER BY s.relative_path LIMIT ? OFFSET ?';
                    params.push(limit, offset * limit);

                    const samples: any = await dbAll(sql, params);

                    // Get volume information for each sample
                    for (const sample of samples) {
                        const volume: any = await dbGet(
                            'SELECT name FROM Volumes WHERE id = ?',
                            [sample.volume_id]
                        );

                        if (volume) {
                            sample.volume_name = volume.name;
                        }

                        const tags: any = await dbAll(
                            'SELECT tag FROM SampleTags WHERE sample_id = ?',
                            [sample.id]
                        );

                        sample.tags = tags.map((t: { tag: string }) => t.tag);
                    }

                    // Get total count for pagination
                    let countSql = 'SELECT COUNT(*) as count FROM Samples s';

                    if (tag) {
                        countSql += ' JOIN SampleTags t ON s.id = t.sample_id';
                    }

                    if (conditions.length > 0) {
                        countSql += ' WHERE ' + conditions.join(' AND ');
                    }

                    const countParams = params.slice(0, params.length - 2); // Remove limit and offset
                    const totalCount: any = await dbGet(countSql, countParams);

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                samples,
                                pagination: {
                                    total: totalCount.count,
                                    limit,
                                    offset
                                }
                            })
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

// Get a specific sample
        this.mcpServer.tool("getSampleInfo",
            "Get a specific sample's information",
            {
                id: z.number().describe("Id of the samples information to fetch"),
            },
            async ({id}) => {
                try {
                    const sample: any = await dbGet('SELECT * FROM Samples WHERE id = ?', [id]);

                    if (!sample) {
                        throw {error: 'Sample not found'};
                    }

                    // Get volume information
                    const volume: any = await dbGet(
                        'SELECT name, physical_path FROM Volumes WHERE id = ?',
                        [sample.volume_id]
                    );

                    if (volume) {
                        sample.volume_name = volume.name;
                        sample.full_path = path.join(volume.physical_path, sample.relative_path);
                    }

                    // Get tags
                    const tags: any = await dbAll(
                        'SELECT tag FROM SampleTags WHERE sample_id = ?',
                        [id]
                    );

                    sample.tags = tags.map((t: { tag: string }) => t.tag);

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(sample)
                        }]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error(errorMessage)
                    return {
                        content: [{
                            type: "text",
                            text: `Error fetching sample info : ${errorMessage}`
                        }]
                    };
                }
            });

// Update a sample
        this.mcpServer.tool("updateSampleTags",
            "Update a sample's tags",
            {
                id: z.number().describe("Id of the sample"),
                tags: z.array(
                    z.string().describe("Tags"),
                )
            },
            async ({id, tags}) => {
                try {
                    // Check if sample exists
                    const sample = await dbGet('SELECT * FROM Samples WHERE id = ?', [id]);
                    if (!sample) {
                        throw {error: 'Sample not found'};
                    }

                    // Update tags if provided
                    if (Array.isArray(tags)) {
                        // Delete all existing tags
                        await dbRun('DELETE FROM SampleTags WHERE sample_id = ?', [id]);

                        // Add new tags
                        for (const tag of tags) {
                            await dbRun(
                                'INSERT INTO SampleTags (sample_id, tag) VALUES (?, ?)',
                                [id, tag]
                            );
                        }
                    }

                    // Update last accessed timestamp
                    await dbRun(
                        'UPDATE Samples SET last_accessed = ? WHERE id = ?',
                        [new Date().toISOString(), id]
                    );

                    const updatedSample: any = await dbGet('SELECT * FROM Samples WHERE id = ?', [id]);
                    const updatedTags: any = await dbAll('SELECT tag FROM SampleTags WHERE sample_id = ?', [id]);
                    updatedSample.tags = updatedTags.map((t: { tag: string }) => t.tag);

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(updatedSample)
                        }]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error(errorMessage)
                    return {
                        content: [{
                            type: "text",
                            text: `Error updating sample tags : ${errorMessage}`
                        }]
                    };
                }
            });

// Delete a sample
        this.mcpServer.tool("Sample",
            "Delete a sample",
            {
                id: z.number().describe("Id of the sample to delete"),
            },
            async ({id}) => {
                try {
                    // Check if sample exists
                    const sample = await dbGet('SELECT * FROM Samples WHERE id = ?', [id]);
                    if (!sample) {
                        throw {error: 'Sample not found'};
                    }

                    // Delete tags first (due to foreign key constraint)
                    await dbRun('DELETE FROM SampleTags WHERE sample_id = ?', [id]);

                    // Delete the sample
                    await dbRun('DELETE FROM Samples WHERE id = ?', [id]);

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({success: true})
                        }]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error(errorMessage)
                    return {
                        content: [{
                            type: "text",
                            text: `Error deleting sample : ${errorMessage}`
                        }]
                    };
                }
            });

        this.mcpServer.tool("loadSample",
            "Load a sample file into a session and returns the path",
            {
                id: z.number().describe("Id of the samples"),
                sessionId: z.string().describe("Id of the session to load the sample into"),
            },
            async ({id, sessionId}) => {
                try {
                    const sample: any = await dbGet(
                        `SELECT s.*, v.physical_path AS volume_path
                         FROM Samples s
                                  JOIN Volumes v ON s.volume_id = v.id
                         WHERE s.id = ?`,
                        [id]
                    );

                    if (!sample) {
                        throw {error: 'Sample not found'};
                    }

                    const filePath = path.join(sample.volume_path, sample.relative_path);

                    try {
                        await statAsync(filePath);
                    } catch (err) {
                        throw {error: 'Sample file not found on disk'};
                    }

                    // Update last accessed timestamp
                    await dbRun(
                        'UPDATE Samples SET last_accessed = ? WHERE id = ?',
                        [new Date().toISOString(), id]
                    );

                    // TODO: Socket message to load the file
                    const session = this.sessionsManager.get(sessionId);
                    if (!session) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        success: false,
                                        error: `Error: Session ${sessionId} not found`
                                    })
                                }
                            ]
                        };
                    }

                    // Send a message to the client to play from library
                    session.ws.send(JSON.stringify({
                        type: 'preload_samples',
                        samples: [filePath]
                    }));

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                filePath
                            })
                        }]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error(errorMessage)
                    return {
                        content: [{
                            type: "text",
                            text: `Error loading sample : ${errorMessage}`
                        }]
                    };
                }
            });
    }
}