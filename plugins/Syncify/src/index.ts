import { LunaUnload, Tracer } from "@luna/core";
import { MediaItem } from "@luna/lib";
import { settings } from "./Settings";
import * as spotify from "./spotify.native";
import { DataSong } from "./types/dataSong";
import { DataPlaylist } from "./types/dataPlaylist";
import { SpotifyPlaylist } from "./types/spotify";
import { SpotifyToDataSong } from "./converter";
import { updatePlaylists } from "./playlistUpdater";
import * as lib from "@luna/lib";
import { start } from "repl";

export { Settings } from "./Settings";

export const unloads = new Set<LunaUnload>();
export const { trace, errSignal } = Tracer("[Syncify]");

export const openSpotifyTokenGeneratorNative = () => spotify.openSpotifyTokenGenerator();
export const getTokenFromGeneratorNative = () => spotify.getTokenFromGenerator();
export const refreshSpotifyTokenNative = (token: string, refreshToken: string) => spotify.refreshSpotifyToken(token, refreshToken);
export const getSpotifyPlaylistsNative = (token: string) => spotify.getSpotifyPlaylists(token);
export const getSpotifyPlaylistSongsNative = (spotifyPlaylist: SpotifyPlaylist, token: string) => spotify.getSpotifyPlaylistSongs(spotifyPlaylist, token);
export const updatePlaylistsNative = () => updatePlaylists();

async function initializePlugin() {
    initializeDatabase();
    await refreshTokenIfNeeded();
    await updatePlaylists();
};

async function refreshTokenIfNeeded() {
    const { token, refreshToken } = settings;
    if (token && refreshToken) {
        const response = await spotify.refreshSpotifyToken(token, refreshToken);
        if (response.success) {
            settings.token = response.token;
        } else {
            console.error("Failed to refresh Spotify token.");
        }
    }
}

initializePlugin().catch(err => {
    console.error("Failed to initialize Syncify plugin:", err);
});

async function initializeDatabase() {
    if(!localStorage.getItem("DataPlaylists") ) {
        localStorage.setItem("DataPlaylists", JSON.stringify([]));
    }

    if(!localStorage.getItem("DataSongs") ) {
        localStorage.setItem("DataSongs", JSON.stringify([]));
    }
}

export async function getDataPlaylists(): Promise<DataPlaylist[]> {
    await initializeDatabase();
    const data = localStorage.getItem("DataPlaylists");
    return data ? JSON.parse(data) : [];
}

export async function getDataSongs(): Promise<DataSong[]> {
    await initializeDatabase();
    const data = localStorage.getItem("DataSongs");
    return data ? JSON.parse(data) : [];
}

export async function addDataPlaylist(playlist: DataPlaylist): Promise<void> {
    const playlists = await getDataPlaylists();
    playlists.push(playlist);
    localStorage.setItem("DataPlaylists", JSON.stringify(playlists));
}

export async function editDataPlaylist(playlist: DataPlaylist): Promise<void> {
    const playlists = await getDataPlaylists();
    const index = playlists.findIndex(p => p.spotifyId === playlist.spotifyId);
    if (index !== -1) {
        playlists[index] = playlist;
        localStorage.setItem("DataPlaylists", JSON.stringify(playlists));
    } else {
        console.warn("Playlist not found for editing:", playlist);
    }
}

export async function addDataSong(song: DataSong): Promise<void> {
    const songs = await getDataSongs();
    songs.push(song);
    localStorage.setItem("DataSongs", JSON.stringify(songs));
}

async function addPlaylistToSync(spotifyId: string): Promise<void> {
    const dataPlaylists = await getDataPlaylists();
    const existingDataPlaylist = dataPlaylists.find(p => p.spotifyId === spotifyId);
    if (existingDataPlaylist) {
        if (settings.activePlaylists.includes(existingDataPlaylist.tidalId)) {
            trace.warn(`Playlist with Spotify ID '${spotifyId}' is already in the active playlists.`);
            return;
        }
        settings.activePlaylists.push(existingDataPlaylist.tidalId);
    }

    const playlists = await getSpotifyPlaylistsNative(settings.token);
    const playlist = playlists.find(p => p.spotifyId === spotifyId);
    if (!playlist) {
        trace.err(`Playlist with Spotify ID '${spotifyId}' not found.`);
        return;
    }

    // create tidal playlist
    const creds = await lib.getCredentials();
    const url = `https://openapi.tidal.com/v2/playlists`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${creds.token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            data: {
                attributes: {
                    accessType: "UNLISTED",
                    description: playlist.description,
                    name: playlist.name
                },
                type: "playlists"
            }
        })
    });
    if (!response.ok) {
        trace.err("Failed to create Tidal playlist:", response.statusText);
        return;
    }

    const data = await response.json();
    const tidalId = data.data.id;
    const newDataPlaylist: DataPlaylist = {
        name: playlist.name,
        spotifyId: playlist.spotifyId,
        tidalId,
        songsData: []
    };

    await addDataPlaylist(newDataPlaylist);
    settings.activePlaylists.push(tidalId);
}

async function removePlaylistFromSync(spotifyId: string): Promise<void> {
    const dataPlaylists = await getDataPlaylists();
    console.log("Data Playlists:", dataPlaylists);
    const existingDataPlaylist = dataPlaylists.find(p => p.tidalId === spotifyId);
    if (!existingDataPlaylist) {
        trace.err(`Playlist with Spotify ID '${spotifyId}' not found in data playlists.`);
        return;
    }

    settings.activePlaylists = settings.activePlaylists.filter(id => id !== existingDataPlaylist.tidalId);
    trace.log(`Removed playlist with Spotify ID '${spotifyId}' from active playlists.`);
}

export async function updateActivePlaylists(): Promise<void> {
    const activePlaylistsSettings = settings.activePlaylistsSettings; // This is the new state for active playlists settings
    const activePlaylists = settings.activePlaylists; // This is the current state of active playlists

    // Remove playlists that are no longer in the settings
    for (const spotifyId of activePlaylists) {
        if (!activePlaylistsSettings.includes(spotifyId)) {
            await removePlaylistFromSync(spotifyId);
        }
    }

    // Add new playlists that are in the settings but not in the current active playlists
    for (const spotifyId of activePlaylistsSettings) {
        if (!activePlaylists.includes(spotifyId)) {
            await addPlaylistToSync(spotifyId);
        }
    }
}