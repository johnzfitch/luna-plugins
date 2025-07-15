import fs from "fs/promises";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { shell } from "electron";
import { SpotifyPlaylist, SpotifySong } from "./types/spotify";
import * as webserver from "./webserver.native";

import { tokenResponse } from "./types/tokenResponse";

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
    const port = await webserver.getServerPort();
    const url = `http://127.0.0.1:${port}/login`;
    try {
        await shell.openExternal(url);
    } catch (err) {
        console.error("Failed to open Spotify token generator:", err);
    }
}

export async function getTokenFromGenerator(): Promise<tokenResponse> {
    let token = await webserver.getAccessToken();
    let refreshToken = await webserver.getRefreshToken();
    console.log("Retrieved tokens from generator:", { token, refreshToken });


    if (!token || !refreshToken) {
        console.error("No token or refresh token found. Please authenticate first.");
        return { token: "", refreshToken: "", success: false };
    }

    return { token, refreshToken, success: true };
}

export async function refreshSpotifyToken(token: string, refreshToken: string, clientId: string, clientSecret: string): Promise<tokenResponse> {
    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to refresh token:", errorText);
            return { token: "", refreshToken: "", success: false };
        }

        const data = await response.json();
        return { token: data.access_token, refreshToken: data.refresh_token || "", success: true };
    } catch (err) {
        console.error("Error refreshing Spotify token:", err);
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
                    artists: item.track.artists.map(artist => artist.name),
                    spotifyId: item.track.id
                });
            }
        }
        return {
            ...spotifyPlaylist,
            songs: songs
        };
    } catch (err) {
        console.error("Error fetching playlist songs:", err);
        return {
            ...spotifyPlaylist,
            songs: []
        };
    }
}
