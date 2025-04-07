import {SSEServerTransport} from "@modelcontextprotocol/sdk/server/sse.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {Logger} from "../utils/logger.js";
import express from "express";
import {ServerConfig} from "./config.js";

export class TransportManager {
    constructor(
        private app: express.Express,
        private mcpServer: McpServer,
        private logger: Logger
    ) {
        this.setupTransport();
    }

    private async setupTransport(): Promise<void> {
        if (process.env.MCP_TRANSPORT === 'http') {
            let transport: SSEServerTransport;
            this.app.get('/sse', async (req, res) => {
                this.logger.info('Received SSE connection');
                transport = new SSEServerTransport('/message', res);
                await this.mcpServer.server.connect(transport);
                this.mcpServer.server.onclose = async () => {
                    await this.mcpServer.server.close();
                    process.exit(0);
                };
            });

            this.app.post('/message', async (req, res) => {
                this.logger.info('Received SSE message');
                await transport.handlePostMessage(req, res);
            });
        } else {
            const transport = new StdioServerTransport();
            await this.mcpServer.server.connect(transport);
            this.logger.info('MCP server connected via STDIO');
            process.on('SIGINT', async () => {
                await this.mcpServer.server.close();
                process.exit(0);
            });
        }
    }
}
