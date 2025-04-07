import path from "path";
import {Logger} from "../utils/logger.js";
import fs from "fs";

export class AudioService {
    private audioOutputs = new Map<string, Buffer[]>();
    constructor(public audioDir: string, private logger: Logger) {}

    public handleAudioData(sessionId: string, data: any) {
        if (!this.audioOutputs.has(sessionId)) {
            this.audioOutputs.set(sessionId, []);
        }

        // Store audio chunks
        const chunks = this.audioOutputs.get(sessionId)!;
        chunks.push(Buffer.from(data.buffer, 'base64'));

        // If this is the final chunk, save to file
        if (data.final) {
            this.saveAudioFile(sessionId, chunks);
        }
    }

    saveAudioFile(sessionId: string, chunks: Buffer[]): string | null {
        if (!this.audioOutputs.has(sessionId)) return null;

        const filename = `${sessionId}-${Date.now()}.wav`;
        const filepath = path.join(this.audioDir, filename);
        const audioBuffer = Buffer.concat(chunks);
        fs.writeFileSync(filepath, audioBuffer);
        this.logger.info(`Audio saved to: ${filepath}`);
        return filename;
    }
}
