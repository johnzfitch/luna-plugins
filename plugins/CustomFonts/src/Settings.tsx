import React from "react";

import { ReactiveStore } from "@luna/core";
import {
    LunaSettings,
    LunaSwitchSetting,
    LunaSecureTextSetting,
    LunaSelectSetting,
    LunaSelectItem,
} from "@luna/ui";

import { updateFont, getAvailableFonts } from ".";

export const storage = ReactiveStore.getStore("CustomFonts");
export const settings = await ReactiveStore.getPluginStorage("CustomFonts", {
    fontName: "",
});

export const Settings = () => {
    const [fontName, setFontName] = React.useState(settings.fontName);
    const [fonts, setFonts] = React.useState<string[]>([]);

    const refreshFonts = async () => {
        try {
            const availableFonts = await getAvailableFonts();
            setFonts(availableFonts);

            // If selected font isn't available anymore, reset
            if (settings.fontName && !availableFonts.includes(settings.fontName)) {
                setFontName((settings.fontName = ""));
                await updateFont();
            }
        } catch (err) {
            console.error("Error fetching available fonts:", err);
        }
    };

    React.useEffect(() => {
        refreshFonts();
    }, []);

    return (
        <LunaSettings>
            <LunaSelectSetting
                title="Custom Font"
                value={fontName}
                onChange={async (e: any) => {
                    setFontName((settings.fontName = e.target.value));
                    await updateFont().catch((err) => {
                        console.error("Error updating font:", err);
                    });
                }}
            >
                <LunaSelectItem value="" children="None" />
                {fonts.map((font) => (
                    <LunaSelectItem key={font} value={font} children={font} />
                ))}
            </LunaSelectSetting>
        </LunaSettings>
    );
};
