import express from 'express';
import http from 'http';
import * as ws from './websocket.native';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

let app: express.Express | null = null;
let server: http.Server | null = null;

/**
 * Starts the HTTP and WebSocket server on the given port.
 * Downloads and serves the frontend automatically.
 * 
 * @param {number} port - The port on which the server should listen.
 * @returns {Promise<void>}
 */
export async function startServer(port: number): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            app = express();

            await registerRoutes();
            await setupFrontend();

            server = http.createServer(app);
            ws.startWebSocketServer(server);

            server.listen(port, () => {
                console.log(`Server is listening on port ${port}`);
                resolve();
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Registers API or middleware routes.
 */
async function registerRoutes(): Promise<void> {
    if (!app) return;

    // TODO: Register endpoints here
}

/**
 * Downloads and serves the latest frontend release.
 * Automatically extracts and serves from a local directory.
 */
async function setupFrontend(): Promise<void> {
    if (!app) return;

    const downloadURL = 'https://github.com/jxnxsdev/TidalWave/releases/latest/download/TidalWave.zip';
    const downloadPath = path.join('tw_frontend.zip');
    const extractPath = path.join('tw_frontend');

    // Clean up any previous files
    if (fs.existsSync(extractPath)) {
        fs.rmSync(extractPath, { recursive: true, force: true });
    }
    if (fs.existsSync(downloadPath)) {
        fs.rmSync(downloadPath, { recursive: true, force: true });
    }

    // Download the frontend zip
    const response = await fetch(downloadURL);
    if (!response.ok) {
        throw new Error(`Failed to download frontend: ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(downloadPath, buffer);

    // Extract and clean up
    const zip = new AdmZip(downloadPath);
    zip.extractAllTo(extractPath, true);
    fs.rmSync(downloadPath, { recursive: true, force: true });

    // Serve static frontend
    app.use('/', express.static(extractPath));
}

/**
 * Stops the HTTP and WebSocket server.
 * Cleans up the app and server instances.
 */
export async function stopServer(): Promise<void> {
    if (server) {
        server.close(() => {
            console.log('Server closed');
        });
        server = null;
    }

    app = null;
}
