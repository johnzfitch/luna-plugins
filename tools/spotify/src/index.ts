import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
import fastifyStatic from '@fastify/static';
import path from 'path';

dotenv.config();

const fastify = Fastify();
fastify.register(cors);
fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/',
});

const tokenCache = new Map<string, { accessToken: string, refreshToken?: string }>();
const loginSessionCache = new Map<string, string>();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const REDIRECT_URI = process.env.REDIRECT_URI!;

const SCOPES = [
    'playlist-read-private',
    'playlist-read-collaborative'
];

fastify.get('/', async (request, reply) => {
    return reply.sendFile('index.html');
});

fastify.get('/login', async (request, reply) => {
    const uuid = (request.query as any).uuid;
    if (!uuid) return reply.status(400).send('Missing uuid');
    const state = randomBytes(8).toString('hex');
    loginSessionCache.set(state, uuid);
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: SCOPES.join(' '),
        redirect_uri: REDIRECT_URI,
        state
    });
    return reply.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

fastify.get('/callback', async (request, reply) => {
    const { code, state } = request.query as any;
    const uuid = loginSessionCache.get(state);
    if (!code || !uuid) return reply.sendFile('error.html');
    loginSessionCache.delete(state);
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI
        })
    });
    const tokenData = await tokenRes.json() as { access_token?: string; refresh_token?: string; [key: string]: any };
    if (!tokenData.access_token) return reply.sendFile('error.html');
    tokenCache.set(uuid, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token
    });
    return reply.sendFile('success.html');
});

fastify.get('/getToken', async (request, reply) => {
    const uuid = (request.query as any).uuid;
    if (!uuid || !tokenCache.has(uuid)) return reply.status(404).send('Not found');
    const token = tokenCache.get(uuid);
    tokenCache.delete(uuid);
    return reply.send(token);
});

fastify.post('/refreshToken', async (request, reply) => {
    const { refreshToken } = request.body as any;
    if (!refreshToken) return reply.status(400).send('Missing refreshToken');
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        })
    });
    const tokenData = await tokenRes.json() as { access_token?: string; [key: string]: any };
    if (!tokenData.access_token) return reply.status(500).send(tokenData);
    for (const [uuid, entry] of tokenCache.entries()) {
        if (entry.refreshToken === refreshToken) {
            tokenCache.set(uuid, {
                accessToken: tokenData.access_token,
                refreshToken
            });
        }
    }
    return reply.send({ accessToken: tokenData.access_token });
});

fastify.listen({ port: 3086, host: '0.0.0.0' }, err => {
    if (err) throw err;
    console.log('Server running at http://localhost:3010');
});
