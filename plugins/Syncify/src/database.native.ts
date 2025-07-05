import sqlite from 'sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { DataPlaylist } from './types/dataPlaylist';
import { DataPlaylistSong } from './types/dataPlaylistSong';
import { DataSong } from './types/dataSong';

let db: sqlite.Database | null = null;

async function getDatabasePath(): Promise<string> {
    const appDataPath = path.join(os.homedir(), ".luna", "Syncify");
    const dbPath = path.join(appDataPath, "syncify.db");

    try {
        await fs.promises.mkdir(appDataPath, { recursive: true });
    } catch (err) {
        console.error("Error creating app data directory:", err);
        throw err;
    }

    return dbPath;
}

export async function createOrOpenDatabase(): Promise<sqlite.Database> {
    if (db) return db;

    try {
        const dbPath = await getDatabasePath();
        db = await new Promise<sqlite.Database>((resolve, reject) => {
            const instance = new sqlite.Database(
                dbPath,
                sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE,
                (err) => (err ? reject(err) : resolve(instance))
            );
        });

        console.log("Database opened successfully at", dbPath);
        return db;
    } catch (err) {
        console.error("Error creating or opening database:", err);
        throw err;
    }
}

export async function closeDatabase(): Promise<void> {
    if (!db) return;

    try {
        await new Promise<void>((resolve, reject) => {
            db!.close((err) => (err ? reject(err) : resolve()));
        });

        console.log("Database closed successfully.");
        db = null;
    } catch (err) {
        console.error("Error closing database:", err);
        throw err;
    }
}

export async function initializeDatabase(): Promise<void> {
    try {
        const database = await createOrOpenDatabase();

        const createPlaylistsTable = `
            CREATE TABLE IF NOT EXISTS playlists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                spotifyId TEXT UNIQUE NOT NULL,
                tidalId TEXT UNIQUE NOT NULL,
                songsData TEXT NOT NULL
            )
        `;

        const createSongsTable = `
            CREATE TABLE IF NOT EXISTS songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                spotifyId TEXT UNIQUE NOT NULL,
                tidalId TEXT UNIQUE NOT NULL
            )
        `;

        database.run(createPlaylistsTable, (err) => {
            if (err) console.error("Error creating playlists table:", err);
        });

        database.run(createSongsTable, (err) => {
            if (err) console.error("Error creating songs table:", err);
        });

    } catch (err) {
        console.error("Error initializing database:", err);
        throw err;
    }
}

function runStatement(stmt: sqlite.Statement, params: any[] = []): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        stmt.run(params, (err) => (err ? reject(err) : resolve()));
    });
}

function finalizeStatement(stmt: sqlite.Statement): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        stmt.finalize((err) => (err ? reject(err) : resolve()));
    });
}

export async function addDataSong(song: DataSong): Promise<void> {
    try {
        const database = await createOrOpenDatabase();
        const stmt = database.prepare(`
            INSERT INTO songs (title, artist, spotifyId, tidalId)
            VALUES (?, ?, ?, ?)
        `);

        await runStatement(stmt, [song.title, song.artist, song.spotifyId, song.tidalId]);
        await finalizeStatement(stmt);
    } catch (err) {
        console.error("addDataSong failed:", err);
        throw err;
    }
}

export async function getDataSongs(): Promise<DataSong[]> {
    try {
        const database = await createOrOpenDatabase();

        return await new Promise<DataSong[]>((resolve, reject) => {
            database.all("SELECT * FROM songs", (err, rows) => {
                if (err) return reject(err);

                const songs: DataSong[] = rows.map((row: any) => ({
                    id: row.id,
                    title: row.title,
                    artist: row.artist,
                    spotifyId: row.spotifyId,
                    tidalId: row.tidalId
                }));

                resolve(songs);
            });
        });
    } catch (err) {
        console.error("getDataSongs failed:", err);
        throw err;
    }
}

export async function addDataPlaylist(playlist: DataPlaylist): Promise<void> {
    try {
        const database = await createOrOpenDatabase();
        const stmt = database.prepare(`
            INSERT INTO playlists (name, spotifyId, tidalId, songsData)
            VALUES (?, ?, ?, ?)
        `);

        await runStatement(stmt, [playlist.name, playlist.spotifyId, playlist.tidalId, playlist.songsData]);
        await finalizeStatement(stmt);
    } catch (err) {
        console.error("addDataPlaylist failed:", err);
        throw err;
    }
}

export async function getDataPlaylists(): Promise<DataPlaylist[]> {
    try {
        const database = await createOrOpenDatabase();

        return await new Promise<DataPlaylist[]>((resolve, reject) => {
            database.all("SELECT * FROM playlists", (err, rows) => {
                if (err) return reject(err);

                const playlists: DataPlaylist[] = rows.map((row: any) => ({
                    id: row.id,
                    name: row.name,
                    spotifyId: row.spotifyId,
                    tidalId: row.tidalId,
                    songsData: row.songsData
                }));

                resolve(playlists);
            });
        });
    } catch (err) {
        console.error("getDataPlaylists failed:", err);
        throw err;
    }
}

export async function editDataPlaylist(playlist: DataPlaylist): Promise<void> {
    try {
        const database = await createOrOpenDatabase();
        const stmt = database.prepare(`
            UPDATE playlists
            SET name = ?, spotifyId = ?, tidalId = ?, songsData = ?
            WHERE id = ?
        `);

        await runStatement(stmt, [
            playlist.name,
            playlist.spotifyId,
            playlist.tidalId,
            playlist.songsData,
            playlist.id
        ]);

        await finalizeStatement(stmt);
    } catch (err) {
        console.error("editDataPlaylist failed:", err);
        throw err;
    }
}
