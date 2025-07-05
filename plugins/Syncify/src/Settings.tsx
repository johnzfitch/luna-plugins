import React, { useEffect, useState } from "react";

import { ReactiveStore } from "@luna/core";
import {
    LunaSettings,
    LunaButtonSetting,
    LunaSelectSetting,
    LunaSelectItem
} from "@luna/ui";

import {
    openSpotifyTokenGeneratorNative,
    getTokenFromGeneratorNative,
    getSpotifyPlaylistsNative,
    updateActivePlaylists
} from ".";
import { updatePlaylistsNative } from ".";

export const storage = ReactiveStore.getStore("Syncify");
export const settings = await ReactiveStore.getPluginStorage("Syncify", {
    isLoggedIn: false,
    token: "",
    refreshToken: "",
    activePlaylists: [] as string[],
    activePlaylistsSettings: [] as string[]
});

export const Settings = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(settings.isLoggedIn);
    const [token, setToken] = useState(settings.token);
    const [refreshToken, setRefreshToken] = useState(settings.refreshToken);
    const [activePlaylistsSettings, setActivePlaylistsSettings] = useState(settings.activePlaylists);
    const [generatorActive, setGeneratorActive] = useState(false);
    const [currentState, setCurrentState] = useState("Log in");
    const [playlists, setPlaylists] = useState<{ spotifyId: string; name: string }[]>([]);

    useEffect(() => {
        setCurrentState(isLoggedIn ? "Log out" : "Log in");
    }, [isLoggedIn]);

    useEffect(() => {
        if (isLoggedIn && token) {
            getSpotifyPlaylistsNative(token)
                .then((playlists) => {
                    console.log("Fetched playlists:", playlists);
                    setPlaylists(playlists);
                })
                .catch((err) => {
                    console.error("Failed to fetch playlists:", err);
                });
        }
    }, [isLoggedIn, token]);

    return (
        <LunaSettings>
            <LunaButtonSetting
                title="Spotify Login"
                desc="Log in to your Spotify account to sync your playlists."
                onClick={async () => {
                    if (isLoggedIn) {
                        setIsLoggedIn((settings.isLoggedIn = false));
                        setToken((settings.token = ""));
                        setRefreshToken((settings.refreshToken = ""));
                        setCurrentState("Log in");
                    } else {
                        if (!generatorActive) {
                            openSpotifyTokenGeneratorNative();
                            setGeneratorActive(true);
                            setCurrentState("Load token after logging in");
                        } else {
                            const tokenResponse = await getTokenFromGeneratorNative();
                            if (tokenResponse.success) {
                                setIsLoggedIn((settings.isLoggedIn = true));
                                setToken((settings.token = tokenResponse.token));
                                setRefreshToken((settings.refreshToken = tokenResponse.refreshToken));
                                setCurrentState("Log out");
                            } else {
                                console.error("Failed to log in to Spotify.");
                                setGeneratorActive(false);
                                setCurrentState("Log in");
                            }
                        }
                    }
                }}
            >
                {currentState}
            </LunaButtonSetting>

            <LunaSelectSetting
                id="active-playlists"
                title="Active Playlists"
                desc="Select the playlists you want to sync with Tidal."
                value={activePlaylistsSettings}
                onChange={(newValues: any) => {
                    setActivePlaylistsSettings((settings.activePlaylistsSettings = newValues.target.value));
                    updateActivePlaylists();
                }}
                multiple
            >
                {playlists.map((playlist) => (
                    <LunaSelectItem key={playlist.spotifyId} value={playlist.spotifyId}>
                        {playlist.name}
                    </LunaSelectItem>
                ))}
            </LunaSelectSetting>
            <LunaButtonSetting
                title="Update Playlists"
                desc="Manually update your playlists."
                onClick={async () => {
                    await updatePlaylistsNative();
                }}
            />
            <LunaButtonSetting
                title="Clear all Playlists"
                desc="Clears the Sync for all playlists. The Synced playlists will not be deleted, but will no longer be synced with Tidal. You can re-add them at any time."
                onClick={async () => {
                    setActivePlaylistsSettings((settings.activePlaylistsSettings = []));
                    updateActivePlaylists();
                }}
            />
        </LunaSettings>
    );
};