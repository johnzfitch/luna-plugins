import fs from 'fs';
import path from 'path';
import * as lib from "@luna/lib"

export const exportPlaylist = async (title: string, playlist: lib.Playlist, basePath: string): Promise<[boolean, string]> => {
    const playlistPath = path.join(basePath, "playlist");
    const musicPath = path.join(basePath, "data"); // structure /data/{artist}/{album}/{track}.flac

    if (!fs.existsSync(playlistPath)) {
        fs.mkdirSync(playlistPath, { recursive: true });
    }

    if (!musicPath ||! fs.existsSync(musicPath)) {
        return [false, "Music path is not set or does not exist."];
    }

    const playlistFilePath = path.join(playlistPath, `${title}.m3u8`);
    const fileStream = fs.createWriteStream(playlistFilePath, { flags: 'w' });
    fileStream.on('error', (err) => {
        return [false, `Error writing to playlist file: ${err.message}`];
    });

    fileStream.write(`#EXTM3U\n`);
    const mediaItemsGenerator = await playlist.mediaItems();
    let hasItems = false;

    for await (const item of mediaItemsGenerator) {
        hasItems = true;
        const flacTags = await item.flacTags();
        const artist = flacTags.tags.artist || "Unknown Artist";
        const album = flacTags.tags.album || "Unknown Album";
        const track = flacTags.tags.title || "Unknown Track";
        const filePath = path.join(musicPath, artist[0], album, `${track}.flac`);
        const relativePath = path.relative(playlistPath, filePath).replace(/\\/g, '/'); // Ensure forward slashes for m3u8
        // example: #EXTINF:309,Metallica - For Whom the Bell Tolls (Remastered)
        //../data/Metallica/Ride The Lightning (Remastered)/For Whom the Bell Tolls (Remastered).flac
        fileStream.write(`#EXTINF:${item.duration},${track}\n`);
        fileStream.write(`${relativePath}\n`);

    }
    fileStream.end();

    return [true, "Playlist exported successfully."];
}

export const mkdirSyncNative = (dirPath: string): void => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

export const writeFileSyncNative = (filePath: string, data: string): void => {
    const dir = path.dirname(filePath);
    mkdirSyncNative(dir);
    fs.writeFileSync(filePath, data, 'utf8');
}

export const existsSyncNative = (filePath: string): boolean => {
    return fs.existsSync(filePath);
}