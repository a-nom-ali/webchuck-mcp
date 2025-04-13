import {SessionsManager} from "../sessionsManager.js";
import {WebSocketHandler} from "../webSocketHandler.js";
import {AudioService} from "../audioService.js";
import {Logger} from "../../utils/logger.js";
import express from "express";


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
        // GET endpoint to retrieve one or more parameter values.
        this.app.post('/api/parameter', asyncHandler(async (req: any, res: any) => {
            const payload = JSON.parse(req.body);
            const messages: any[] = [];
            if (payload.length > 0)
            {
                for (const {parameters, sessionId} of payload) {
                    try {
                        const sessionMessages: any[] = [];
                        if (this.sessionsManager) {
                            let session = this.sessionsManager.get(sessionId);
                            if (session) {
                                session.ws.send(JSON.stringify({
                                    type: 'get_parameter_value',
                                    payload: parameters
                                }));
                                await new Promise(resolve => setTimeout(resolve, 15 * (
                                    parameters.length > 0
                                        ? parameters.length
                                        : 15
                                )));

                                //Maybe we need a new reference?
                                session = this.sessionsManager.get(sessionId);

                                parameters.forEach((parameter:string) => {
                                    const value = this.sessionsManager.getParameter(sessionId, parameter);
                                    sessionMessages.push({
                                        name: parameter,
                                        value
                                    });
                                })
                                messages.push(sessionMessages);
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
        }));

        // PUT endpoint to update one or more parameter values.
        this.app.put('/api/parameter', asyncHandler(async (req: any, res: any) => {
            const payload = JSON.parse(req.body);
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
            res.send({
                content: messages.map(sessionMessages => ({
                    type: "text",
                    text: JSON.stringify(sessionMessages)}))
            });
        }));
    }
}
