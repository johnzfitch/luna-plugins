import fs from "fs/promises";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { shell } from "electron";
import { SpotifyPlaylist, SpotifySong } from "./types/spotify";

import { tokenResponse } from "./types/tokenResponse";

const generatorUrl = "https://syncify.jxnxsdev.me/login?uuid=";
const tokenUrl = "https://syncify.jxnxsdev.me/getToken?uuid=";

const appDataPath = path.join(os.homedir(), ".luna", "Syncify");
const dataPath = path.join(appDataPath, "data.json");

async function ensureDataFile(): Promise<{ uuid: string }> {
    try {
        await fs.mkdir(appDataPath, { recursive: true });

        try {
            const data = JSON.parse(await fs.readFile(dataPath, "utf-8"));
            return data;
        } catch {
            const newData = { uuid: uuidv4() };
            await fs.writeFile(dataPath, JSON.stringify(newData, null, 2), "utf-8");
            return newData;
        }
    } catch (err) {
        console.error("Error ensuring data file:", err);
        throw err;
    }
}

export async function openSpotifyTokenGenerator(): Promise<void> {
    try {
        const { uuid } = await ensureDataFile();
        const url = `${generatorUrl}${uuid}`;
        shell.openExternal(url);
    } catch {
        // Optionally notify the user or log error
    }
}

export async function getTokenFromGenerator(): Promise<tokenResponse> {
    try {
        const { uuid } = await ensureDataFile();
        const response = await fetch(`${tokenUrl}${uuid}`);

        if (!response.ok) throw new Error("Request failed");

        const json = await response.json();

        if (!json.accessToken || !json.refreshToken) {
            return { token: "", refreshToken: "", success: false };
        }

        return {
            token: json.accessToken,
            refreshToken: json.refreshToken,
            success: true
        };
    } catch (err) {
        console.error("Failed to fetch token:", err);
        return { token: "", refreshToken: "", success: false };
    }
}

export async function refreshSpotifyToken(token: string, refreshToken: string): Promise<tokenResponse> {
    try {
        const response = await fetch("https://syncify.jxnxsdev.me/refreshToken", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ token, refreshToken })
        });

        if (!response.ok) throw new Error("Request failed");

        const json = await response.json();

        if (!json.accessToken) {
            return { token: "", refreshToken: "", success: false };
        }

        return {
            token: json.accessToken,
            refreshToken: "",
            success: true
        };
    } catch (err) {
        console.error("Failed to refresh token:", err);
        return { token: "", refreshToken: "", success: false };
    }
}

export async function getSpotifyPlaylists(token: string): Promise<SpotifyPlaylist[]> {
    try {
        let paylists: SpotifyPlaylist[] = [];

        const response = await fetch("https://api.spotify.com/v1/me/playlists", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("Failed to fetch playlists");

        const data = await response.json();

        for (const item of data.items) {
            paylists.push({
                name: item.name,
                spotifyId: item.id,
                description: item.description || ""
            });
        }

        return paylists;
    } catch (err) {
        console.error("Error fetching user playlists:", err);
        return [];
    }
}

export async function getSpotifyPlaylistSongs(spotifyPlaylist: SpotifyPlaylist, token: string): Promise<SpotifyPlaylist> {
    try {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${spotifyPlaylist.spotifyId}/tracks`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("Failed to fetch playlist songs");

        const data = await response.json();
        const songs: SpotifySong[] = [];

        for (const item of data.items) {
            if (item.track) {
                songs.push({
                    title: item.track.name,
                    // @ts-expect-error
                    artist: item.track.artists.map(artist => artist.name).join(", "),
                    spotifyId: item.track.id
                });
            }
        }
        return {
            ...spotifyPlaylist,
            songs
        };
    } catch (err) {
        console.error("Error fetching playlist songs:", err);
        return {
            ...spotifyPlaylist,
            songs: []
        };
    }
}
