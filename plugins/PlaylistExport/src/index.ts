import { LunaUnload, Tracer } from "@luna/core";
import { settings } from "./Settings";
import * as lib from "@luna/lib"
import { mkdirSyncNative, writeFileSyncNative, existsSyncNative } from "./playlistexport.native";

export { Settings } from "./Settings";

export const unloads = new Set<LunaUnload>();
export const { trace, errSignal } = Tracer("[PlaylistExport]");

export async function exportPlaylist(id: string) {
    const playlist = await lib.Playlist.fromId(id);
    if (!playlist) {
        trace.msg.err(`Playlist with ID ${id} not found.`);
        return;
    }

    const basePath = settings.basePath;
    if (!basePath) {
        trace.msg.err("Base path is not set. Please configure it in the settings.");
        return;
    }

    const playlistPath = await path.join(basePath, "playlist");
    const musicPath = await path.join(basePath, "data"); // structure /data/{artist}/{album}/{track}.flac

    await mkdirSyncNative(playlistPath);

    if (!musicPath || !existsSyncNative(musicPath)) {
        trace.msg.err("Music path is not set or does not exist.");
        return;
    }

    const title = await playlist.title();

    const playlistFilePath = await path.join(playlistPath, `${title}.m3u8`);
    const output = [`#EXTM3U\n`];
    const mediaItemsGenerator = await playlist.mediaItems();
    let hasItems = false;
    for await (const item of mediaItemsGenerator) {
        hasItems = true;
        const flacTags = await item.flacTags();
        const artist = flacTags.tags.artist || "Unknown Artist";
        const album = flacTags.tags.album || "Unknown Album";
        const track = flacTags.tags.title || "Unknown Track";
        const filePath = await path.join(musicPath, artist[0], album, `${track}.flac`);
        const relativePath = await path.relative(playlistPath, filePath).replace(/\\/g, '/'); // Ensure forward slashes for m3u8
        output.push(`#EXTINF:${item.duration},${track}\n`);
        output.push(`${relativePath}\n`);
    }

    if (!hasItems) {
        trace.msg.err("No items found in the playlist.");
        return;
    }

    try {
        await writeFileSyncNative(playlistFilePath, output.join(''));
        trace.msg.log(`Playlist exported successfully to ${playlistFilePath}`);
    } catch (error) {
        if (error instanceof Error) {
            trace.msg.err(`Error writing to playlist file: ${error.message}`);
        } else {
            trace.msg.err(`Error writing to playlist file: ${String(error)}`);
        }
    }
}

export const start = () => {
    const url = settings.playlistUrl;
    if (!url) {
        trace.msg.err("Playlist URL is not set. Please configure it in the settings.");
        return;
    }

    const id = url.split("/").pop();

    if (!id) {
        trace.msg.err("Invalid playlist URL. Could not extract ID.");
        return;
    }

    exportPlaylist(id);
}