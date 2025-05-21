import http from 'http';
import * as ws from 'ws';

let wss: ws.Server | null = null;
let clients: ws.WebSocket[] = [];

/**
 * Starts the WebSocket server on the given HTTP server instance.
 * Ensures connections are tracked and cleaned up when closed.
 *
 * @param {http.Server} server - The HTTP server to attach the WebSocket server to.
 * @returns {Promise<void>}
 */
export async function startWebSocketServer(server: http.Server): Promise<void> {
    return new Promise<void>((resolve) => {
        if (wss) {
            return resolve();
        }

        wss = new ws.WebSocketServer({ server });

        wss.on('connection', (client: ws.WebSocket) => {
            clients.push(client);

            client.on('close', () => {
                clients = clients.filter(c => c !== client);
            });
        });

        wss.on('listening', () => {
            resolve();
        });
    });
}

/**
 * Sends a message to all connected WebSocket clients.
 *
 * @param {string} message - The message to broadcast.
 */
export async function broadcastToClients(message: string): Promise<void> {
    if (!wss) return;

    clients.forEach(client => {
        if (client.readyState === ws.WebSocket.OPEN) {
            client.send(message);
        }
    });
}
