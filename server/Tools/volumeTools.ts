import {Logger} from "../../utils/logger.js";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {dbRun, dbAll, dbGet} from "../DB/dbManager.js";
import {promisify} from "util";
import fs from "fs";
import path from "path";
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);

export class VolumeTools {
    constructor(
        private mcpServer: McpServer,
        private logger: Logger
    ) {
        this.configureTools();
    }

    private configureTools(): void {
// ================== Volume Routes ==================
// Get all volumes
        this.mcpServer.tool("getVolumeList",
            "Get all mapped volumes",
            {
                sessionId: z.string().describe("Session ID for an existing WebChucK session")
            },
            async ({sessionId}) => {
                try {
                    const volumes = await dbAll('SELECT * FROM Volumes ORDER BY name');
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    sessionId,
                                    volumes
                                })
                            }
                        ]
                    };

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error('Error retrieving volumes:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error retrieving volumes: ${errorMessage}`
                            }
                        ]
                    };
                }
            });

// Get a specific volume
        this.mcpServer.tool("getVolume",
            "Get a specific volume",
            {
                id: z.number().describe("Id of the volume information to retrieve")
            },
            async ({id}) => {
                try {

                    const volume = await dbGet('SELECT * FROM Volumes WHERE id = ?', [id]);

                    if (!volume) {
                        throw {error: 'Volume not found'};
                    }

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(volume)
                            }
                        ]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error('Error retrieving volumes:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error retrieving volumes: ${errorMessage}`
                            }
                        ]
                    };
                }
            });

// Create a new volume
        this.mcpServer.tool("createVolume",
            "Create a new volume",
            {
                name: z.string().describe("Name of the new volume"),
                physical_path: z.string().describe("Physical path of the volume"),
                type: z.string().describe("Type of volume, currently only 'filesystem' type"),
                description: z.string().describe("Volume description"),
            },
            async ({name, physical_path, type = 'filesystem', description}) => {
                try {

                    if (!name || !physical_path) {
                        throw {error: 'Name and physical path are required'};
                    }

                    // Check if volume with same name already exists
                    const existing = await dbGet('SELECT id FROM Volumes WHERE name = ?', [name]);
                    if (existing) {
                        throw {error: 'A volume with this name already exists'};
                    }

                    // Check if the physical path exists
                    try {
                        await statAsync(physical_path);
                    } catch (err) {
                        throw {error: 'Physical path does not exist or is not accessible'};
                    }

                    const result:any = await dbRun(
                        'INSERT INTO Volumes (name, physical_path, type, description) VALUES (?, ?, ?, ?)',
                        [name, physical_path, type, description]
                    );

                    const newVolume = await dbGet('SELECT * FROM Volumes WHERE id = ?', [result.id]);

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(newVolume)
                            }
                        ]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error('Error creating volume:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error creating volumes: ${errorMessage}`
                            }
                        ]
                    };
                }
            });

// Update a volume
        this.mcpServer.tool("updateVolume",
            "Update a volume",
            {
                id: z.number().describe("Id of the volume to update"),
                name: z.string().describe("Name of the volume"),
                physical_path: z.string().describe("Physical path of the volume"),
                description: z.string().describe("Volume description"),
                is_active: z.boolean().describe("Whether this volume is active"),
            },
            async ({id, name, physical_path, description, is_active}) => {
                try {
                    // Check if volume exists
                    const volume:any = await dbGet('SELECT * FROM Volumes WHERE id = ?', [id]);
                    if (!volume) {
                        throw {error: 'Volume not found'};
                    }

                    // If name is changing, check if new name is available
                    if (name && name !== volume.name) {
                        const existing = await dbGet('SELECT id FROM Volumes WHERE name = ?', [name]);
                        if (existing) {
                            throw {error: 'A volume with this name already exists'};
                        }
                    }

                    const updates = [];
                    const params = [];

                    if (name) {
                        updates.push('name = ?');
                        params.push(name);
                    }

                    if (physical_path) {
                        // Check if the physical path exists
                        try {
                            await statAsync(physical_path);
                        } catch (err) {
                            throw {error: 'Physical path does not exist or is not accessible'};
                        }

                        updates.push('physical_path = ?');
                        params.push(physical_path);
                    }

                    if (description !== undefined) {
                        updates.push('description = ?');
                        params.push(description);
                    }

                    if (is_active !== undefined) {
                        updates.push('is_active = ?');
                        params.push(is_active ? 1 : 0);
                    }

                    params.push(id);

                    if (updates.length > 0) {
                        await dbRun(
                            `UPDATE Volumes
                             SET ${updates.join(', ')}
                             WHERE id = ?`,
                            params
                        );
                    }

                    const updatedVolume = await dbGet('SELECT * FROM Volumes WHERE id = ?', [id]);

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(updatedVolume)
                            }
                        ]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error('Error updating volume:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error updating volumes: ${errorMessage}`
                            }
                        ]
                    };
                }
            });

// Delete a volume
        this.mcpServer.tool("deleteVolume",
            "Delete a volume. This will not delete the physical files.",
            {
                id: z.number().describe("Id of the volume to delete")
            },
            async ({id}) => {
                try {
                    // Check if volume exists
                    const volume = await dbGet('SELECT * FROM Volumes WHERE id = ?', [id]);
                    if (!volume) {
                        throw {error: 'Volume not found'};
                    }

                    // Check if volume has any samples
                    const sampleCount:any = await dbGet(
                        'SELECT COUNT(*) as count FROM Samples WHERE volume_id = ?',
                        [id]
                    );

                    if (sampleCount.count > 0) {
                        throw {
                            error: 'Cannot delete volume with existing samples',
                            sampleCount: sampleCount.count
                        };
                    }

                    await dbRun('DELETE FROM Volumes WHERE id = ?', [id]);

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({success:true})
                            }
                        ]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error('Error deleting volume:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error deleting volumes: ${errorMessage}`
                            }
                        ]
                    };
                }
            });

// Scan a volume to index samples
        this.mcpServer.tool("scanVolume",
            "Scan a volume to index samples",
            {
                id: z.number().describe("Id of the volume to scan")
            },
            async ({id}) => {
                try {
                    // Check if volume exists
                    const volume:any = await dbGet('SELECT * FROM Volumes WHERE id = ?', [id]);
                    if (!volume) {
                        throw {error: 'Volume not found'};
                    }

                    // This would normally be a background job, but for simplicity,
                    // we'll implement it synchronously
                    const scanResults = {
                        totalFiles: 0,
                        newFiles: 0,
                        updatedFiles: 0,
                        errors: [] as Array<{file?: string, directory?: string, error: string}>
                    };

                    async function scanDirectory(dirPath:string, relativePath:string = '') {
                        try {
                            const entries = await readdirAsync(dirPath, {withFileTypes: true});

                            for (const entry of entries) {
                                const entryPath = path.join(dirPath, entry.name);
                                const entryRelativePath = path.join(relativePath, entry.name).replace(/\\/g, '/');

                                if (entry.isDirectory()) {
                                    // Recursively scan subdirectories
                                    await scanDirectory(entryPath, entryRelativePath);
                                } else if (entry.isFile()) {
                                    // Check if it's an audio file (basic check)
                                    if ((/\.(wav|mp3|ogg|aif|aiff|flac)$/i).test(entry.name)) {
                                        scanResults.totalFiles++;

                                        try {
                                            const stats = await statAsync(entryPath);

                                            // Check if the file already exists in the database
                                            const existingSample:any = await dbGet(
                                                'SELECT id, file_size_bytes FROM Samples WHERE volume_id = ? AND relative_path = ?',
                                                [volume.id, entryRelativePath]
                                            );

                                            if (!existingSample) {
                                                // New file, add it to the database
                                                await dbRun(
                                                    `INSERT INTO Samples
                                                     (volume_id, relative_path, filename, file_size_bytes, is_indexed,
                                                      created_at)
                                                     VALUES (?, ?, ?, ?, 1, ?)`,
                                                    [volume.id, entryRelativePath, entry.name, stats.size, new Date().toISOString()]
                                                );
                                                scanResults.newFiles++;
                                            } else if (existingSample.file_size_bytes !== stats.size) {
                                                // File has been updated, update the database
                                                await dbRun(
                                                    `UPDATE Samples
                                                     SET file_size_bytes = ?,
                                                         is_indexed      = 1
                                                     WHERE id = ?`,
                                                    [stats.size, existingSample.id]
                                                );
                                                scanResults.updatedFiles++;
                                            }
                                        } catch (err:any) {
                                            scanResults.errors.push({
                                                file: entryRelativePath,
                                                error: err.message
                                            } as any);
                                        }
                                    }
                                }
                            }
                        } catch (err:any) {
                            scanResults.errors.push({
                                directory: relativePath || '/',
                                error: err.message
                            } as any);
                        }
                    }

                    await scanDirectory(volume.physical_path);

                    // Mark any files that no longer exist as not indexed
                    const samples:any = await dbAll(
                        'SELECT id, relative_path FROM Samples WHERE volume_id = ? AND is_indexed = 1',
                        [volume.id]
                    );

                    for (const sample of samples) {
                        const fullPath = path.join(volume.physical_path, sample.relative_path);
                        try {
                            await statAsync(fullPath);
                        } catch (err) {
                            // File doesn't exist anymore
                            await dbRun(
                                'UPDATE Samples SET is_indexed = 0 WHERE id = ?',
                                [sample.id]
                            );
                        }
                    }

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    message: 'Volume scan completed',
                                    volumeId: volume.id,
                                    volumeName: volume.name,
                                    results: scanResults
                                })
                            }
                        ]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error('Error scanning volume:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error scanning volumes: ${errorMessage}`
                            }
                        ]
                    };
                }
            });
    }
}