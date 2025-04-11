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

export class SnippetApiController {
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
// ================== ChucK Snippet Routes ==================

// Get all snippets with optional filtering
        this.app.get('/api/snippets', asyncHandler(async (req:any, res:any) => {
            const {tag, search} = req.query;

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

            res.json(snippets);
        }));

// Get a specific snippet by ID
        this.app.get('/api/snippets/:id', asyncHandler(async (req:any, res:any) => {
            const {id} = req.params;

            const snippet:any = await dbGet('SELECT * FROM ChuckSnippets WHERE id = ?', [id]);

            if (!snippet) {
                return res.status(404).json({error: 'Snippet not found'});
            }

            const tags:any = await dbAll(
                'SELECT tag FROM SnippetTags WHERE snippet_id = ?',
                [id]
            );

            snippet.tags = tags.map((t: { tag: string }) => t.tag);

            res.json(snippet);
        }));

// Create a new snippet
        this.app.post('/api/snippets', asyncHandler(async (req:any, res:any) => {
            const {name, code, description, tags = []} = req.body;

            if (!name || !code) {
                return res.status(400).json({error: 'Name and code are required'});
            }

            const existing = await dbGet('SELECT id FROM ChuckSnippets WHERE name = ?', [name]);
            if (existing) {
                return res.status(409).json({error: 'A snippet with this name already exists'});
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

            res.status(201).json(newSnippet);
        }));

// Update an existing snippet
        this.app.put('/api/snippets/:id', asyncHandler(async (req:any, res:any) => {
            const {id} = req.params;
            const {name, code, description, tags} = req.body;

            // Check if snippet exists
            const snippet:any = await dbGet('SELECT * FROM ChuckSnippets WHERE id = ?', [id]);
            if (!snippet) {
                return res.status(404).json({error: 'Snippet not found'});
            }

            // If name is changing, check if new name is available
            if (name && name !== snippet.name) {
                const existing = await dbGet('SELECT id FROM ChuckSnippets WHERE name = ?', [name]);
                if (existing) {
                    return res.status(409).json({error: 'A snippet with this name already exists'});
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

            res.json(updatedSnippet);
        }));

// Delete a snippet
        this.app.delete('/api/snippets/:id', asyncHandler(async (req:any, res:any) => {
            const {id} = req.params;

            // Check if snippet exists
            const snippet = await dbGet('SELECT * FROM ChuckSnippets WHERE id = ?', [id]);
            if (!snippet) {
                return res.status(404).json({error: 'Snippet not found'});
            }

            // Delete tags first (due to foreign key constraint)
            await dbRun('DELETE FROM SnippetTags WHERE snippet_id = ?', [id]);

            // Delete the snippet
            await dbRun('DELETE FROM ChuckSnippets WHERE id = ?', [id]);

            res.status(204).end();
        }));

// Execute a snippet
        this.app.post('/api/snippets/:id/execute', asyncHandler(async (req:any, res:any) => {
            const {id} = req.params;
            const {sessionId} = req.body;

            if (!sessionId) {
                return res.status(400).json({error: 'ChucK session ID is required'});
            }

            const snippet:any = await dbGet('SELECT code FROM ChuckSnippets WHERE id = ?', [id]);
            if (!snippet) {
                return res.status(404).json({error: 'Snippet not found'});
            }

            // This is a placeholder - in a real implementation, you would call
            // your ChucK execution service here
            // For now, we'll just return the code that would be executed

            res.json({
                message: 'Snippet execution requested',
                sessionId,
                code: snippet.code
            });
        }));
    }
}
