import {SessionsManager} from "../sessionsManager.js";
import {WebSocketHandler} from "../webSocketHandler.js";
import {AudioService} from "../audioService.js";
import {Logger} from "../../utils/logger.js";
import {dbRun, dbAll, dbGet} from "../DB/dbManager.js";

import express from "express";
import path from "path"
import fs from "fs"
import {promisify} from 'util';
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);

// Middleware for error handling
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};

export class VolumeApiController {
    constructor(
        private app: express.Express,
        private sessionsManager: SessionsManager,
        private webSocketHandler: WebSocketHandler,
        private audioService: AudioService,
        private logger: Logger,
        private port: any,
        private working_directory: string
    ) {
        this.setupRoutes();
    }

    private setupRoutes(): void {
// ================== Volume Routes ==================

// Get all volumes
        this.app.get('/api/volumes', asyncHandler(async (req:any, res:any) => {
            const volumes = await dbAll('SELECT * FROM Volumes ORDER BY name');
            res.json(volumes);
        }));

// Get a specific volume
        this.app.get('/api/volumes/:id', asyncHandler(async (req:any, res:any) => {
            const {id} = req.params;

            const volume = await dbGet('SELECT * FROM Volumes WHERE id = ?', [id]);

            if (!volume) {
                return res.status(404).json({error: 'Volume not found'});
            }

            res.json(volume);
        }));

// Create a new volume
        this.app.post('/api/volumes', asyncHandler(async (req:any, res:any) => {
            const {name, physical_path, type = 'filesystem', description} = req.body;

            if (!name || !physical_path) {
                return res.status(400).json({error: 'Name and physical path are required'});
            }

            // Check if volume with same name already exists
            const existing = await dbGet('SELECT id FROM Volumes WHERE name = ?', [name]);
            if (existing) {
                return res.status(409).json({error: 'A volume with this name already exists'});
            }

            // Check if the physical path exists
            try {
                await statAsync(physical_path);
            } catch (err) {
                return res.status(400).json({error: 'Physical path does not exist or is not accessible'});
            }

            const result:any = await dbRun(
                'INSERT INTO Volumes (name, physical_path, type, description) VALUES (?, ?, ?, ?)',
                [name, physical_path, type, description]
            );

            const newVolume = await dbGet('SELECT * FROM Volumes WHERE id = ?', [result.id]);

            res.status(201).json(newVolume);
        }));

// Update a volume
        this.app.put('/api/volumes/:id', asyncHandler(async (req:any, res:any) => {
            const {id} = req.params;
            const {name, physical_path, description, is_active} = req.body;

            // Check if volume exists
            const volume:any = await dbGet('SELECT * FROM Volumes WHERE id = ?', [id]);
            if (!volume) {
                return res.status(404).json({error: 'Volume not found'});
            }

            // If name is changing, check if new name is available
            if (name && name !== volume.name) {
                const existing = await dbGet('SELECT id FROM Volumes WHERE name = ?', [name]);
                if (existing) {
                    return res.status(409).json({error: 'A volume with this name already exists'});
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
                    return res.status(400).json({error: 'Physical path does not exist or is not accessible'});
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

            res.json(updatedVolume);
        }));

// Delete a volume
        this.app.delete('/api/volumes/:id', asyncHandler(async (req:any, res:any) => {
            const {id} = req.params;

            // Check if volume exists
            const volume = await dbGet('SELECT * FROM Volumes WHERE id = ?', [id]);
            if (!volume) {
                return res.status(404).json({error: 'Volume not found'});
            }

            // Check if volume has any samples
            const sampleCount:any = await dbGet(
                'SELECT COUNT(*) as count FROM Samples WHERE volume_id = ?',
                [id]
            );

            if (sampleCount.count > 0) {
                return res.status(409).json({
                    error: 'Cannot delete volume with existing samples',
                    sampleCount: sampleCount.count
                });
            }

            await dbRun('DELETE FROM Volumes WHERE id = ?', [id]);

            res.status(204).end();
        }));

// Scan a volume to index samples
        this.app.post('/api/volumes/:id/scan', asyncHandler(async (req:any, res:any) => {
            const {id} = req.params;

            // Check if volume exists
            const volume:any = await dbGet('SELECT * FROM Volumes WHERE id = ?', [id]);
            if (!volume) {
                return res.status(404).json({error: 'Volume not found'});
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

            res.json({
                message: 'Volume scan completed',
                volumeId: volume.id,
                volumeName: volume.name,
                results: scanResults
            });
        }));

    }
}
