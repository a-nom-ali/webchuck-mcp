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

export class SamplesApiController {
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

        // Get all samples with optional filtering
        this.app.get('/api/samples', asyncHandler(async (req:any, res:any) => {
            const {volume_id, tag, search, limit = 100, offset = 0} = req.query;

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
            params.push(parseInt(limit), parseInt(offset));

            const samples:any = await dbAll(sql, params);

            // Get volume information for each sample
            for (const sample of samples) {
                const volume:any = await dbGet(
                    'SELECT name FROM Volumes WHERE id = ?',
                    [sample.volume_id]
                );

                if (volume) {
                    sample.volume_name = volume.name;
                }

                const tags:any = await dbAll(
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
            const totalCount:any = await dbGet(countSql, countParams);

            res.json({
                samples,
                pagination: {
                    total: totalCount.count,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });
        }));

// Get a specific sample
        this.app.get('/api/samples/:id', asyncHandler(async (req:any, res:any) => {
            const {id} = req.params;

            const sample:any = await dbGet('SELECT * FROM Samples WHERE id = ?', [id]);

            if (!sample) {
                return res.status(404).json({error: 'Sample not found'});
            }

            // Get volume information
            const volume:any = await dbGet(
                'SELECT name, physical_path FROM Volumes WHERE id = ?',
                [sample.volume_id]
            );

            if (volume) {
                sample.volume_name = volume.name;
                sample.full_path = path.join(volume.physical_path, sample.relative_path);
            }

            // Get tags
            const tags:any = await dbAll(
                'SELECT tag FROM SampleTags WHERE sample_id = ?',
                [id]
            );

            sample.tags = tags.map((t: { tag: string }) => t.tag);

            res.json(sample);
        }));

// Update a sample
        this.app.put('/api/samples/:id', asyncHandler(async (req:any, res:any) => {
            const {id} = req.params;
            const {tags} = req.body;

            // Check if sample exists
            const sample = await dbGet('SELECT * FROM Samples WHERE id = ?', [id]);
            if (!sample) {
                return res.status(404).json({error: 'Sample not found'});
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

            const updatedSample:any = await dbGet('SELECT * FROM Samples WHERE id = ?', [id]);
            const updatedTags:any = await dbAll('SELECT tag FROM SampleTags WHERE sample_id = ?', [id]);
            updatedSample.tags = updatedTags.map((t: { tag: string }) => t.tag);

            res.json(updatedSample);
        }));

// Delete a sample
        this.app.delete('/api/samples/:id', asyncHandler(async (req:any, res:any) => {
            const {id} = req.params;

            // Check if sample exists
            const sample = await dbGet('SELECT * FROM Samples WHERE id = ?', [id]);
            if (!sample) {
                return res.status(404).json({error: 'Sample not found'});
            }

            // Delete tags first (due to foreign key constraint)
            await dbRun('DELETE FROM SampleTags WHERE sample_id = ?', [id]);

            // Delete the sample
            await dbRun('DELETE FROM Samples WHERE id = ?', [id]);

            res.status(204).end();
        }));

// Get a sample file
        this.app.get('/api/samples/:id/file', asyncHandler(async (req:any, res:any) => {
            const {id} = req.params;

            const sample:any = await dbGet(
                `SELECT s.*, v.physical_path AS volume_path
                 FROM Samples s
                          JOIN Volumes v ON s.volume_id = v.id
                 WHERE s.id = ?`,
                [id]
            );

            if (!sample) {
                return res.status(404).json({error: 'Sample not found'});
            }

            const filePath = path.join(sample.volume_path, sample.relative_path);

            try {
                await statAsync(filePath);
            } catch (err) {
                return res.status(404).json({error: 'Sample file not found on disk'});
            }

            // Update last accessed timestamp
            await dbRun(
                'UPDATE Samples SET last_accessed = ? WHERE id = ?',
                [new Date().toISOString(), id]
            );

            // Send the file
            res.sendFile(filePath);
        }));

    }
}
