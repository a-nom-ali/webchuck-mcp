import {SessionsManager} from "../sessionsManager.js";
import {WebSocketHandler} from "../webSocketHandler.js";
import {AudioService} from "../audioService.js";
import {Logger} from "../../utils/logger.js";
import express from "express";
import fs from "fs"
import {promisify} from 'util';
import WebSocket from "ws";

// Middleware for error handling
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};

export class ParameterApiController {
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

        // Get current parameter value
        this.app.get('/api/parameter/:name', asyncHandler(async (req:any, res:any) => {
            const {name} = req.params;
            const {sessionId} = req.query;

            const session = this.sessionsManager.get(sessionId);
            if (!session) {
                return res.status(404).json({error: 'Session not found'});
            }

            if (session.ws.readyState !== WebSocket.OPEN) {
                return res.status(400).json({error: 'WebChucK client not connected'});
            }

            session.ws.send(JSON.stringify({
                type: 'get_parameter_value',
                payload: {
                    name: name,
                    sessionId
                }
            }));

            // Wait a moment for the client to respond
            await new Promise(resolve => setTimeout(resolve, 200));

            const value = this.sessionsManager.getParameter(sessionId, name);

            res.send({
                success: value !== undefined,
                name: name,
                value
            });

            res.status(204).end();
        }));

        // Update current parameter value
        this.app.put('/api/parameter/:name', asyncHandler(async (req:any, res:any) => {
            const {name} = req.params;
            const {sessionId, paramValue, tween} = req.body;

            const session = this.sessionsManager.get(sessionId);
            if (!session) {
                return res.status(404).json({error: 'Session not found'});
            }

            if (session.ws.readyState !== WebSocket.OPEN) {
                return res.status(400).json({error: 'WebChucK client not connected'});
            }

            session.ws.send(JSON.stringify({
                type: 'set_parameter_value',
                payload: {
                    name: name,
                    value: paramValue,
                    tween,
                    sessionId
                }
            }));

            // Wait a moment for the client to respond
            await new Promise(resolve => setTimeout(resolve, 200));

            const value = this.sessionsManager.getParameter(sessionId, name);

            res.send({
                success: value === paramValue,
                name: name,
                value: paramValue
            });
        }));

    }
}
