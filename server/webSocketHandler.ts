import WebSocket, {WebSocketServer} from "ws";
import {SessionsManager} from "./sessionsManager.js";
import {AudioService} from "./audioService.js";
import {Logger} from "../utils/logger.js";
import {sessionsManager, Session} from "./sessionsManager.js";
import {v4 as uuidv4} from "uuid";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {type} from "node:os";

export class WebSocketHandler {
    constructor(
        public wss: WebSocketServer,
        private sessionsManager: SessionsManager,
        private audioService: AudioService,
        private logger: Logger,
        private mcpServer: McpServer
    ) {
        this.setup();
    }

    private setup(): void {
        this.wss.on('connection', (ws) => {
            const sessionId = uuidv4();
            const session: Session = {
                ws,
                status: 'idle',
                activeCode: null,
                debugInfo: {
                    lastExecutionError: "",
                    lastPreloadResult: "",
                    lastPlayerLibraryError: ""
                }
            };
            this.sessionsManager.set(sessionId, session);
            this.logger.info(`New WebChucK client connected: ${sessionId}`);

            ws.send(JSON.stringify({ type: 'session_created', sessionId }));

            ws.on('message', (message) => this.handleMessage(sessionId, message));
            ws.on('close', () => this.handleClose(sessionId));
            ws.on('error', (error) => this.logger.error(`WebSocket error for session ${sessionId}:`, error));
        });
    }

    private handleMessage(sessionId: string, message: WebSocket.Data): void {
        const data = JSON.parse(message.toString());
        const session = this.sessionsManager.get(sessionId);
        if (!session) return;

        const handlers: Record<string, (sessionId: string, data: any) => void> = {
            status_update: this.handleStatusUpdate.bind(this),
            audio_data: this.audioService.handleAudioData.bind(this.audioService),
            preload_complete: this.handlePreloadComplete.bind(this),
            preload_error: this.handlePreloadError.bind(this),
            execute_code_error: this.handleExecuteCodeError.bind(this),
            rename_session: this.handleRenameSession.bind(this),
            play_from_library_error: this.handlePlayFromLibraryError.bind(this),
            play_from_library_success: this.handlePlayFromLibrarySuccess.bind(this),
            error: this.handleClientError.bind(this),
            console_messages: this.handleConsoleMessages.bind(this),
            get_parameter_value_feedback: this.handleGetSetParameterValue.bind(this),
            set_parameter_value_feedback: this.handleGetSetParameterValue.bind(this),
            set_code_from_editor: this.handleSetCodeFromEditor.bind(this),
        };

        if (handlers[data.type]) {
            handlers[data.type](sessionId, data);
        } else {
            this.logger.info(`Error from WebChucK client ${sessionId}: ${data.type}`);
        }

    }

    // ==== WebChucK Status Update Handler ====
    private handleStatusUpdate(sessionId: string, data: any) {
        const session = this.sessionsManager.get(sessionId);
        if (!session) return;

        session.status = data.status;
        this.logger.info(`Session ${sessionId} status updated to: ${data.status}`);
    }

// ==== WebChucK Preload Complete Handler ====
    private handlePreloadComplete(sessionId: string, data: any) {
        const session = this.sessionsManager.get(sessionId);
        if (!session) {
            this.logger.warn(`Session ${sessionId} not found for preload complete notification`);
            return;
        }

        this.logger.info(`Session ${sessionId} preload complete: ${JSON.stringify(data)}`);

        // Store preload results in session debug info
        session.debugInfo.lastPreloadResult += JSON.stringify(data);

        this.mcpServer.server.notification({
            method: 'message',
            params: {
                message: JSON.stringify(data),
                sessionId: sessionId
            }
        })

    }

// ==== WebChucK Execute Code Error Handler ====
    private handleExecuteCodeError(sessionId: string, data: any) {
        const session = this.sessionsManager.get(sessionId);
        if (!session) {
            this.logger.warn(`Session ${sessionId} not found for execution error notification`);
            return;
        }

        this.logger.info(`Session ${sessionId} execution error updated to: ${JSON.stringify(data)}`);

        // Store execution error in session debug info
        session.debugInfo.lastExecutionError += JSON.stringify(data, null, 2);

        this.mcpServer.server.notification({
            method: 'error',
            params: {
                message: JSON.stringify(data),
                sessionId: sessionId
            }
        })
    }

// ==== WebChucK Execute Code Error Handler ====
    private handlePreloadError(sessionId: string, data: any) {
        const session = this.sessionsManager.get(sessionId);
        if (session)
            session.debugInfo.lastPreloadResult += JSON.stringify(data);

        this.logger.info(`Session ${sessionId} preload error updated to: ${JSON.stringify(data)}`);
        this.mcpServer.server.notification({
            method: 'error',
            params: {
                message: JSON.stringify(data),
                sessionId: sessionId
            }
        })

    }

// ==== WebChucK Session Rename Handler ====
    private handleRenameSession(sessionId: string, data: any) {
        const session = this.sessionsManager.get(sessionId);
        if (!session) {
            this.logger.warn(`Session ${sessionId} not found for rename request`);
            return;
        }

        // Validate name
        if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
            this.logger.warn(`Invalid name provided for session ${sessionId}: ${data.name}`);
            if (session.ws.readyState === WebSocket.OPEN) {
                session.ws.send(JSON.stringify({
                    type: 'rename_session_error',
                    error: 'Invalid name provided. Name must be a non-empty string.'
                }));
            }
            return;
        }

        // Set the name
        const name = data.name.trim();
        const success = this.sessionsManager.setName(sessionId, name);

        if (success) {
            this.logger.info(`Session ${sessionId} renamed to "${name}"`);
            if (session.ws.readyState === WebSocket.OPEN) {
                session.ws.send(JSON.stringify({
                    type: 'session_renamed_ack',
                    name: name
                }));
            }
        } else {
            this.logger.error(`Failed to rename session ${sessionId}`);
            if (session.ws.readyState === WebSocket.OPEN) {
                session.ws.send(JSON.stringify({
                    type: 'rename_session_error',
                    error: 'Failed to set name on server.'
                }));
            }
        }
    }

    private handlePlayFromLibraryError(sessionId: string, data: any): void {
        const session = this.sessionsManager.get(sessionId);
        if (!session) {
            this.logger.warn(`Session ${sessionId} not found for play library error notification`);
            return;
        }

        this.logger.info(`Session ${sessionId} play library error updated to: ${data.status}`);

        // Store execution error in session debug info
        session.debugInfo.lastPlayerLibraryError += data.error;
    }
    private handlePlayFromLibrarySuccess(sessionId: string, data: any): void {
        const session = this.sessionsManager.get(sessionId);
        this.logger.info(`Session ${sessionId} play library successfully loaded.`);
    }
    private handleClientError(sessionId: string, data: any): void {
        this.handleExecuteCodeError(sessionId, data);
    }
    private handleConsoleMessages(sessionId: string, data: any): void {
        this.handleExecuteCodeError(sessionId, data);
    }
    private handleClose(sessionId: string): void {
        this.sessionsManager.delete(sessionId);
        this.logger.info(`WebChucK client disconnected: ${sessionId}`);
    }

    private handleGetSetParameterValue(sessionId: string, parameters: any) {
        const session = this.sessionsManager.get(sessionId);
        this.logger.info("ALL: ${JSON.stringify(parameters, null, 2)}");
        this.logger.info(sessionId);
        this.logger.info(`${JSON.stringify(parameters, null, 2)}`);
        if (!session) return;
        if (Array.isArray(parameters)) {
            parameters.forEach(parameter => {
                this.logger.info("IS ARRAY: ${JSON.stringify(parameter, null, 2)}");
                this.logger.info(`${JSON.stringify(parameter, null, 2)}`);
                this.sessionsManager.setParameter(sessionId, parameter.name, parameter.value);
            });
        }
        else if (typeof parameters === 'object') {
            this.logger.info("IS OBJECT: ${JSON.stringify(parameters, null, 2)}");
            this.logger.info(`${JSON.stringify(parameters, null, 2)}`);
            for (const key of Object.keys(parameters).filter(key => key !== "undefined")) {
                const parameter = parameters[key];
                this.logger.info("PARAM: ${JSON.stringify(parameter, null, 2)}");
                this.logger.info(`${JSON.stringify(parameter, null, 2)}`);
                this.sessionsManager.setParameter(sessionId, parameter.name, parameter.value);
            }
        }
    }

    private handleSetCodeFromEditor(sessionId: string, data: any) {
        const session = this.sessionsManager.get(sessionId);
        if (!session) return;
        session.activeCode = data.code;
    }

    clear_execution_error_response(sessionId: string) {
        const session = this.sessionsManager.get(sessionId);
        if (session) {
            session.debugInfo.lastExecutionError = "";
        }
    }

    clear_preload_response(sessionId: string) {
        const session = this.sessionsManager.get(sessionId);
        if (session) {
            session.debugInfo.lastPreloadResult = "";
        }
    }
}
