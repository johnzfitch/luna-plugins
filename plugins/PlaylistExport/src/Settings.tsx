import React, { useEffect } from "react";

import { ReactiveStore } from "@luna/core";
import {
    LunaButtonSetting,
    LunaSettings,
    LunaSwitchSetting,
    LunaTextSetting
} from "@luna/ui";

import { start } from ".";

export const storage = ReactiveStore.getStore("PlaylistExport");
export const settings = await ReactiveStore.getPluginStorage("PlaylistExport", {
    basePath: "",
    playlistUrl: ""
});

export const Settings = () => {
    const [basePath, setBasePath] = React.useState(settings.basePath);
    const [url, setUrl] = React.useState(settings.playlistUrl);

    return (
        <LunaSettings>
            <LunaTextSetting
                title="Base Path"
                description="The base path relartive to the export patth where the music files are located. Expected format: /data/{artist}/{album}/{track}.flac"
                value={basePath}
                onChange={(e: any) => {
                    setBasePath((settings.basePath = e.target.value));
                }}
            />
            <LunaTextSetting
                title="Playlist URL"
                description="The URL of the playlist to export. The ID will be extracted from this URL."
                value={url}
                onChange={(e: any) => {
                    setUrl((settings.playlistUrl = e.target.value));
                }}
            />
            <LunaButtonSetting
                title="Export m3u8 Playlist"
                desc="Exports the playlist to a m3u8 file."
                onClick={start}
                children="Export Playlist"
            />
        </LunaSettings>
    );
};
