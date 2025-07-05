import * as lib from "@luna/lib";
import { DataPlaylist } from "./types/dataPlaylist";
import { DataSong } from "./types/dataSong";
import {
  getSpotifyPlaylistsNative,
  getSpotifyPlaylistSongsNative,
  getDataPlaylists,
  getDataSongs,
  addDataSong,
  editDataPlaylist,
  trace
} from ".";
import { settings } from "./Settings";
import { SpotifyToDataSong } from "./converter";

let isUpdating = false;
export async function updatePlaylists() {
  if (isUpdating) {
    trace.warn("Playlist update already in progress. Please wait until the current update is finished.");
    return;
  }

  isUpdating = true;
  try {
    await updatePlaylistsInt();
  } catch (error) {
    trace.err(`Error during playlist update: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    isUpdating = false;
  }
}

export async function updatePlaylistsInt() {
  if (!settings.isLoggedIn) {
    trace.warn("User is not logged in. Cannot update playlists. Please log in to Spotify first.");
    return;
  }

  const spotifyPlaylists = await getSpotifyPlaylistsNative(settings.token);
  if (!spotifyPlaylists?.length) {
    trace.warn("No Spotify playlists found.");
    return;
  }

  const playlistsToSync = settings.activePlaylists;
  if (!playlistsToSync.length) {
    trace.warn("No active playlists to sync. Please select playlists in the settings.");
    return;
  }

  const dataPlaylists = await getDataPlaylists();
  let dataSongs = await getDataSongs();

  for (const playlistId of playlistsToSync) {
    const playlist = await lib.Playlist.fromId(playlistId);
    if (!playlist) {
      trace.warn(`Playlist with ID ${playlistId} not found.`);
      continue;
    }

    const dataPlaylist = dataPlaylists.find(p => p.tidalId === playlistId);
    if (!dataPlaylist) {
      const title = await playlist.title();
      trace.err(`Data playlist with ID ${playlistId} not found. Cannot sync playlist '${title}'. Please readd it in the settings.`);
      continue;
    }

    const spotifyPlaylist = spotifyPlaylists.find(p => p.spotifyId === dataPlaylist.spotifyId);
    if (!spotifyPlaylist) {
      trace.err(`Playlist '${dataPlaylist.name}' not found in Spotify playlists. Has it been deleted on Spotify?`);
      continue;
    }

    const spotifySongs = await getSpotifyPlaylistSongsNative(spotifyPlaylist, settings.token);
    const spotifySongList = spotifySongs.songs ?? [];

    if (!spotifySongList.length) {
      trace.warn(`No songs found in Spotify playlist '${spotifyPlaylist.name}'.`);
      continue;
    }

    const existingSongsMap = new Map(dataSongs.map(song => [song.spotifyId, song]));
    const songsToConvert = spotifySongList.filter(song => !existingSongsMap.has(song.spotifyId));

    const convertedSongs: DataSong[] = [];
    for (const spotifySong of songsToConvert) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between searches
      const dataSong = await SpotifyToDataSong(spotifySong);
      if (!dataSong) {
        trace.warn(`Failed to convert Spotify song '${spotifySong.title}' to DataSong.`);
        continue;
      }
      await addDataSong(dataSong);
      convertedSongs.push(dataSong);
    }

    const newDataSongs = convertedSongs;
    dataSongs.push(...newDataSongs);

    const dataPlaylistSongs: DataSong[] = [];
    for (const spotifySong of spotifySongList) {
      const dataSong =
        existingSongsMap.get(spotifySong.spotifyId) ||
        newDataSongs.find(s => s.spotifyId === spotifySong.spotifyId);

      if (dataSong) {
        dataPlaylistSongs.push(dataSong);
      }
    }

    if (!dataPlaylistSongs.length) {
      trace.warn(`No valid songs found for playlist '${spotifyPlaylist.name}'.`);
      continue;
    }

    const hasChanged = JSON.stringify(dataPlaylist.songsData) !== JSON.stringify(dataPlaylistSongs);
    if (!hasChanged) {
      trace.log(`No changes detected for playlist '${dataPlaylist.name}'.`);
      continue;
    }

    dataPlaylist.songsData = dataPlaylistSongs;
    await editDataPlaylist(dataPlaylist);

    const mediaItems: lib.MediaItem[] = [];
    for (const song of dataPlaylistSongs) {
      const mediaItem = await lib.MediaItem.fromId(song.tidalId);
      if (mediaItem) {
        mediaItems.push(mediaItem);
      } else {
        trace.warn(`Media item with ID '${song.tidalId}' not found.`);
      }
    }

    if (!mediaItems.length) {
      trace.warn(`No valid media items found for playlist '${dataPlaylist.name}'.`);
      continue;
    }

    const playlistItemsAsync = await playlist.mediaItems();
    const playlistItems: lib.MediaItem[] = [];
    for await (const item of playlistItemsAsync) {
      playlistItems.push(item);
    }

    let etag = await getPlaylistETag(String(playlist.uuid));
    if (!etag) {
      trace.err(`Failed to retrieve ETag for playlist '${dataPlaylist.name}'. Skipping update.`);
      continue;
    }

    let offsetCount = 0;

    for (let i = 0; i < mediaItems.length; i++) {
      const newItem = mediaItems[i];
      const existingItem = playlistItems[i];

      if (existingItem?.id === newItem.id) continue;

      if (existingItem) {
        await deleteMediaItemFromPlaylist(playlist, i - offsetCount);
        offsetCount++;
      }

      const result = await addMediaItemToPlaylist(playlist, newItem, etag);
      if (!result.success) {
        trace.err(`Failed to add media item '${newItem.title}' to playlist '${dataPlaylist.name}'. Aborting further updates.`);
        break;
      }

      etag = result.newEtag ?? etag;
      trace.log(`Added media item '${newItem.title}' to playlist '${dataPlaylist.name}'.`);
    }

    for (let i = mediaItems.length; i < playlistItems.length; i++) {
      await deleteMediaItemFromPlaylist(playlist, i - offsetCount);
      trace.log(`Removed media item '${playlistItems[i].title}' from playlist '${dataPlaylist.name}'.`);
    }

    trace.log(`Playlist '${dataPlaylist.name}' updated successfully with ${mediaItems.length} songs.`);
  }
}

async function deleteMediaItemFromPlaylist(playlist: lib.Playlist, index: number): Promise<void> {
  try {
    const url = `https://desktop.tidal.com/v1/playlists/${playlist.uuid}/items/${index}?order=INDEX&orderDirection=ASC`;
    const creds = await lib.getCredentials();

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${creds.token}`,
      }
    });

    if (!response.ok) {
      trace.err(`Failed to delete media item from playlist: ${response.statusText}`);
    }
  } catch (error) {
    trace.err(`Error deleting media item from playlist: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function addMediaItemToPlaylist(
  playlist: lib.Playlist,
  mediaItem: lib.MediaItem,
  etag: string
): Promise<{ success: boolean; newEtag?: string }> {
  try {
    const url = `https://desktop.tidal.com/v1/playlists/${playlist.uuid}/items`;
    const creds = await lib.getCredentials();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${creds.token}`,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "application/json",
        "If-None-Match": etag
      },
      referrer: `https://desktop.tidal.com/playlist/${playlist.uuid}`,
      referrerPolicy: "strict-origin-when-cross-origin",
      body: `onArtifactNotFound=FAIL&onDupes=FAIL&trackIds=${mediaItem.id}`
    });

    if (!response.ok) {
      trace.err(`Failed to add media item: ${response.status} ${response.statusText}`);
      return { success: false };
    }

    const newEtag = response.headers.get("etag");
    return { success: true, newEtag: newEtag ?? undefined };
  } catch (error) {
    trace.err(`Error adding media item: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false };
  }
}

async function getPlaylistETag(playlistId: string): Promise<string | null> {
  try {
    const url = `https://desktop.tidal.com/v1/playlists/${playlistId}/items?countryCode=DE&locale=de_DE&deviceType=DESKTOP`;
    const creds = await lib.getCredentials();

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${creds.token}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      trace.err(`Failed to fetch playlist ETag: ${response.statusText}`);
      return null;
    }

    const etag = response.headers.get("etag");
    if (!etag) {
      trace.err("ETag header not found in playlist response.");
      return null;
    }

    return etag;
  } catch (error) {
    trace.err(`Error fetching ETag: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
