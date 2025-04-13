import {fileURLToPath} from 'url';
import fs from "fs";
import path from "path";
import {Server} from "./server/server.js";
import {sessionsManager} from "./server/sessionsManager.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
process.env.LOGGING_FILE = 'true';

import {Logger, LogLevel} from "./utils/logger.js";

process.env.LOGGING_FILE = 'true';
const WORKING_DIRECTORY = process.env.WORKING_DIRECTORY || __dirname;
const logger = new Logger('WebChucK MCP Server', LogLevel.INFO);

// Create directory for audio files if it doesn't exist
const AUDIO_DIR = path.join(WORKING_DIRECTORY, 'public/audio_files/Waves');

if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, {recursive: true});
}

const server = new Server(sessionsManager, WORKING_DIRECTORY, AUDIO_DIR);