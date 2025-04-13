// server/config.ts
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface ServerConfig {
    port: number;
    host: string;
    publicUrl: string;
    isDevelopment: boolean;
    corsOrigins: string[];
    audioDirectory: string;
    workingDirectory: string;
}

export function getServerConfig(workingDir: string, audioDir: string): ServerConfig {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const port = parseInt(process.env.PORT || '3030', 10);
    const host = process.env.HOST || '0.0.0.0'; // Use 0.0.0.0 to listen on all interfaces
    const publicUrl = process.env.PUBLIC_URL || `http://localhost:${port}`;

    // Define allowed origins for CORS
    // In development, we might want to allow specific front-end dev servers
    const corsOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',')
        : [publicUrl, 'http://localhost:5173']; // Default includes Vite's default port

    return {
        port,
        host,
        publicUrl,
        isDevelopment,
        corsOrigins,
        audioDirectory: audioDir,
        workingDirectory: workingDir
    };
}

export const EXCLUDED_SAMPLE_KEYWORDS = [
    'FatBoy',
    'FluidR3_GM',
    'MusyngKite',
    'Tabla'
];