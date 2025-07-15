import express, { Request, Response } from 'express';
import { createServer, Server } from 'http';

import errorHtml from "file://assets/error.html?base64&minify";
import successHtml from "file://assets/success.html?base64&minify";

let app: express.Express;
let server: Server;

let serverPort: number = 2402;

let clientId = '';
let clientSecret = '';
let accessToken = '';
let refreshToken = '';

// Decode base64 HTML content
const decodedErrorHtml = Buffer.from(errorHtml, 'base64').toString('utf-8');
const decodedSuccessHtml = Buffer.from(successHtml, 'base64').toString('utf-8');

export function startWebServer(port: number): void {
  serverPort = port;
  app = express();
  server = createServer(app);

  app.use(express.json());

  app.get('/', (_req, res) => {
    res.send('Syncify Web Server is running');
  });

  app.get('/success.html', (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(decodedSuccessHtml);
  });

  app.get('/error.html', (req, res) => {
    const errorMessage = req.query.error ? decodeURIComponent(req.query.error as string) : 'Unknown error';
    const content = decodedErrorHtml.replace('{{error}}', errorMessage); // optional placeholder support
    res.setHeader('Content-Type', 'text/html');
    res.send(content);
  });

  app.get('/login', (_req, res) => {
    if (!clientId || !clientSecret) {
      const error = encodeURIComponent('Client ID and Secret are not set');
      return res.redirect(`/error.html?error=${error}`);
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: `http://127.0.0.1:${port}/callback`,
      scope: [
        'playlist-read-private',
        'playlist-read-collaborative'
      ].join(' ')
    });

    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  });

  app.get('/callback', async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;

    if (!code) {
      const error = encodeURIComponent('Missing code parameter');
      return res.redirect(`/error.html?error=${error}`);
    }

    try {
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `http://127.0.0.1:${port}/callback`
        })
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        console.error('Token fetch failed:', errorText);
        const error = encodeURIComponent('Failed to fetch token');
        return res.redirect(`/error.html?error=${error}`);
      }

      const tokenData = await tokenRes.json() as { access_token?: string; refresh_token?: string; [key: string]: any };

        if (!tokenData.access_token) {
            const error = encodeURIComponent('No access token received');
            return res.redirect(`/error.html?error=${error}`);
        }

        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token || '';


      return res.redirect('/success.html');
    } catch (error) {
      console.error('Callback error:', error);
      const msg = encodeURIComponent('An error occurred during authentication');
      return res.redirect(`/error.html?error=${msg}`);
    }
  });

  app.get('/token', (req: Request, res: Response) => {
    if (!accessToken || !refreshToken) {
      return res.status(400).json({ error: 'No token available. Please authenticate first.' });
    }
    res.json({ accessToken, refreshToken });
  });

  app.get('/credentials', (req: Request, res: Response) => {
    if (!clientId || !clientSecret) {
        return res.status(400).json({ error: 'Client ID and Secret are not set.' });
        }
    res.json({ clientId, clientSecret });
    });

  server.listen(port, () => {
    console.log(`✅ Syncify Web Server is running on http://localhost:${port}`);
  });
}

export function stopWebServer(): void {
  if (server) {
    server.close(() => {
      console.log('🛑 Syncify Web Server has been stopped');
    });
  } else {
    console.warn('⚠️ No web server is running to stop');
  }
}

export async function setCredentials(id: string, secret: string): Promise<void> {
  clientId = id;
  clientSecret = secret;
}

export async function getAccessToken() {
  const response = await fetch('http://localhost:2402/token');
  if (!response.ok) {
    console.error("Failed to fetch access token:", response.statusText);
    return '';
  }
    const data = await response.json();
    accessToken = data.accessToken || '';
    refreshToken = data.refreshToken || '';
    return accessToken;

}

export async function getRefreshToken() {
    const response = await fetch('http://localhost:2402/token');
    if (!response.ok) {
        console.error("Failed to fetch refresh token:", response.statusText);
        return '';
    }
    const data = await response.json();
    refreshToken = data.refreshToken || '';
    return refreshToken;
}

export function getServerPort(): number {
  return serverPort;
}
