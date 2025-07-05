import type { LunaUnload } from "@luna/core";
import { MediaItem } from "@luna/lib";
import { settings } from "./Settings";
import * as spotify from "./spotify.native";
import * as database from "./database.native";
import { DataSong } from "./types/dataSong";
import { DataPlaylist } from "./types/dataPlaylist";
import { DataPlaylistSong } from "./types/dataPlaylistSong";
import { SpotifyPlaylist } from "./types/spotify";

export { Settings } from "./Settings";

export const unloads = new Set<LunaUnload>();

export const openSpotifyTokenGeneratorNative = () => spotify.openSpotifyTokenGenerator();
export const getTokenFromGeneratorNative = () => spotify.getTokenFromGenerator();
export const refreshSpotifyTokenNative = (token: string, refreshToken: string) => spotify.refreshSpotifyToken(token, refreshToken);
export const getSpotifyPlaylistsNative = (token: string) => spotify.getSpotifyPlaylists(token);
export const getSpotifyPlaylistSongsNative = (spotifyPlaylist: SpotifyPlaylist, token: string) => spotify.getSpotifyPlaylistSongs(spotifyPlaylist, token);
/*export const createOrOpenDatabaseNative = () => database.createOrOpenDatabase();
export const closeDatabaseNative = () => database.closeDatabase();
export const initializeDatabaseNative = () => database.initializeDatabase();
export const addDataSongNative = (dataSong: DataSong) => database.addDataSong(dataSong);
export const addDataPlaylistNative = (dataPlaylist: DataPlaylist) => database.addDataPlaylist(dataPlaylist);
export const getDattaSongsNative = () => database.getDataSongs();
export const getDataPlaylistsNative = () => database.getDataPlaylists();
export const editDataPlaylistNative = (dataPlaylist: DataPlaylist) => database.editDataPlaylist(dataPlaylist);
export const getSpotifyPlaylistsNative = (token: string) => spotify.getSpotifyPlaylists(token);*/

async function initializePlugin() {
    //await createOrOpenDatabaseNative();
    //await initializeDatabaseNative();
    // await refreshTokenIfNeeded(); // TODO: Uncomment when releasing

    const playlists = await spotify.getSpotifyPlaylists(settings.token);

    const songs = await getSpotifyPlaylistSongsNative(playlists[0], settings.token);
    console.log("Fetched songs:", songs);
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

unloads.add(async () => {
    //await closeDatabaseNative();
});

initializePlugin().catch(err => {
    console.error("Failed to initialize Syncify plugin:", err);
});