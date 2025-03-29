import { appendFileSync } from 'fs';
import {fileURLToPath} from 'url';
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKING_DIRECTORY = process.env.WORKING_DIRECTORY || __dirname;

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Check environment variable for logging
const isLoggingEnabled = process.env.LOGGING === 'true';

// Check environment variable for logging in a file
const isLoggingFileEnabled = true; //process.env.LOGGING_FILE === 'true';

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix: string, level: LogLevel = LogLevel.INFO) {
    this.prefix = prefix;
    this.level = level;
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: any) {
    this.log(LogLevel.ERROR, message, error);
  }

  isLoggingEnabled(): boolean {
    return isLoggingEnabled;
  }

  isLoggingFileEnabled(): boolean {
    return isLoggingFileEnabled;
  }

  private log(level: LogLevel, message: string, data?: any) {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const logMessage = `[${timestamp}] [${levelStr}] [${this.prefix}] ${message}`;

    // Write to file if file logging is enabled
    if (this.isLoggingFileEnabled()) {
      try {
          appendFileSync(path.join(WORKING_DIRECTORY, 'log.txt'), logMessage + '\n');
          if (data) {
              appendFileSync(path.join(WORKING_DIRECTORY, 'log.txt'), JSON.stringify(data, null, 2) + '\n');
          }
      } catch (error) {
          console.error('Failed to write to log file:', error);
      }
    }

    // Write to console if logging is enabled
    if (this.isLoggingEnabled()) {
      if (data) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  }
}
