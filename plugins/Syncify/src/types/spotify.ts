export type SpotifyPlaylist = {
    name: string;
    description: string;
    spotifyId: string;
    songs?: SpotifySong[];
}

export type SpotifySong = {
    title: string;
    artists: string[];
    spotifyId: string;
}