import React, { useEffect } from "react";

import { ReactiveStore } from "@luna/core";
import { LunaSettings, LunaSwitchSetting, LunaNumberSetting, LunaButtonSetting, LunaSelectSetting } from "@luna/ui";

import { openSpotifyTokenGeneratorNative, getTokenFromGeneratorNative } from ".";

export const storage = ReactiveStore.getStore("Syncify");
export const settings = await ReactiveStore.getPluginStorage("Syncify", { isLoggedIn: false, token: "", refreshToken: "", activePlaylists: [] });


export const Settings = () => {
    const [isLoggedIn, setIsLoggedIn] = React.useState(settings.isLoggedIn);
    const [token, setToken] = React.useState(settings.token);
    const [refreshToken, setRefreshToken] = React.useState(settings.refreshToken);
    const [activePlaylists, setActivePlaylists] = React.useState(settings.activePlaylists);
    const [generatorActive, setGeneratorActive] = React.useState(false);

    const [currentState, setCurrentState] = React.useState("Log in");

    useEffect(() => {
        if (isLoggedIn) {
            setCurrentState("Log out");
        } else {
            setCurrentState("Log in");
        }
    }, [isLoggedIn]);

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
                        setActivePlaylists((settings.activePlaylists = []));
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
                                setActivePlaylists((settings.activePlaylists = []));
                                setCurrentState("Log out");
                            } else {
                                console.error("Failed to log in to Spotify.");
                                setGeneratorActive(false);
                                setCurrentState("Log in");
                            }
                        }
                    }
                }}
                children={currentState}
            />
        </LunaSettings>
    );
}