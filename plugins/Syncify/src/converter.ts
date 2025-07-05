import * as lib from "@luna/lib";
import * as core from "@luna/core";
import { v4 } from "uuid";


import { DataSong } from "./types/dataSong";
import { SpotifySong } from "./types/spotify";

export async function SpotifyToDataSong(spotifySong: SpotifySong): Promise<DataSong | undefined> {
    if (!spotifySong) {
        return undefined;
    }

    const title = spotifySong.title;
    const artists = spotifySong.artists.join(" ");
    const searchTerm = `${title} ${artists}`.trim();
    const creds = await lib.getCredentials();

    const searchResults = await fetch(`https://api.tidal.com/v2/search/?includeContributors=true&includeDidYouMean=true&includeUserPlaylists=false&limit=20&query=${encodeURIComponent(searchTerm)}&supportsUserData=true&types=TRACKS`, {
        headers: {
            "Method": "GET",
            "Authorization": `Bearer ${creds.token}`
        }
    });

    if (!searchResults.ok) {
        console.error("Failed to fetch search results:", searchResults.statusText);
        return undefined;
    }

    const data = await searchResults.json();
    if (!data || !data.tracks.items || data.tracks.items.length === 0) {
        console.warn("No search results found for:", searchTerm);
        return undefined;
    }

    const firstResult = data.tracks.items[0];
    if (!firstResult || !firstResult.id) {
        console.warn("No valid result found in search results for:", searchTerm);
        return undefined;
    }

    const uuid = await v4();

    const dataSong: DataSong = {
        title: firstResult.title,
        artist: firstResult.artists.map((contributor: any) => contributor.name).join(", "),
        tidalId: firstResult.id,
        spotifyId: spotifySong.spotifyId,
        id: uuid
    };

    return dataSong;
}