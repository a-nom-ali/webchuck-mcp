import {Logger} from "../../utils/logger.js";
import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";
import {AudioService} from "../audioService.js";
import fs from "fs";
import path from "path";

export class SampleResource {
    constructor(
        private mcpServer: McpServer,
        private audioService: AudioService,
        private logger: Logger,
    ) {
        this.configureResource();
    }

    private configureResource(): void {
        // ==== Create dynamic resource for audio files ====
        this.mcpServer.resource(
            "audioFile",
            new ResourceTemplate("audio://{filename}", {
                list:
                    async () => {
                        try {
                            const files = fs.readdirSync(this.audioService.audioDir).filter(file =>
                                file.endsWith('.wav') || file.endsWith('.aiff')
                            );
                            return {
                                resources: files.map(filename => ({
                                    name: filename,
                                    uri: `audio://${filename}`
                                }))
                            };
                        } catch (error) {
                            this.logger.error('Error listing audio files for MCP resource:', error);
                            return {resources: []};
                        }
                    }
            }),
            async (uri, {filename}) => {
                const filepath = path.join(this.audioService.audioDir, filename.toString());

                try {
                    const stats = fs.statSync(filepath);
                    if (fs.existsSync(filepath)) {
                        return {
                            contents: [{
                                uri: uri.href,
                                text: `Audio file: ${filename}
Size: ${(stats.size / 1024).toFixed(2)} KB
Created: ${stats.birthtime.toISOString()}
Last modified: ${stats.mtime.toISOString()}
        
To play this file, use the executeChucK tool with this code:
\`\`\`
// Play audio file
SndBuf buf => dac;
"${filename}" => buf.read;
0.5 => buf.gain;
buf.length() => now;
\`\`\``
                            }]
                        };
                    } else {
                        return {
                            contents: [{
                                uri: uri.href,
                                text: `Error: Audio file not found: ${filename}`
                            }]
                        };
                    }
                } catch (error) {
                    this.logger.error(`Error accessing audio file ${filename}:`, error);
                    return {
                        contents: [{
                            uri: uri.href,
                            text: `Error accessing audio file: ${error}`
                        }]
                    };
                }
            }
        );
    }
}