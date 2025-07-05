import { DataSong } from "./dataSong";

export type DataPlaylist = {
    name: string;
    spotifyId: string;
    tidalId: string;
    songsData: DataSong[];
};