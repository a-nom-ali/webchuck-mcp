import fs from "fs";
import path from "path";
import {server} from "./server/server.js";
import {Logger, LogLevel} from "./utils/logger.js";

process.env.LOGGING_FILE = 'true';
const WORKING_DIRECTORY = process.env.WORKING_DIRECTORY || ".";
const logger = new Logger('WebChucK MCP Server', LogLevel.INFO);

// Create directory for audio files if it doesn't exist
const AUDIO_DIR = path.join(WORKING_DIRECTORY, 'public/audio_files/Waves/FluidR3_GM');

if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, {recursive: true});
}

server(WORKING_DIRECTORY, AUDIO_DIR);
