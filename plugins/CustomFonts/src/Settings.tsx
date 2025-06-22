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
import { title } from "process";

export const storage = ReactiveStore.getStore("CustomFonts");
export const settings = await ReactiveStore.getPluginStorage("CustomFonts", {
    fontName: "",
});

export const Settings = () => {
    const [fontName, setFontName] = React.useState(settings.fontName);
    const [fonts, setFonts] = React.useState<string[]>([]);

    const titleDiv = document.querySelector("._title_a453dad");
    const savedDiv = `TIDA<b><span style="color: #32f4ff;">Luna</span></b>	<span style="color: red;">BETA</span>`;

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
                    if (e.target.value === "Comic Sans MS") {
                        titleDiv!.innerHTML += ` <span style="color:#1E90FF;font-family:'Comic Sans MS',cursive,sans-serif;font-size:1em;font-weight:bold;text-shadow:1px 1px 0 #FFD700,-1px -1px 0 #FF69B4;transform:rotate(-3deg) skew(-3deg);display:inline-block;padding:0.1em 0.3em;border:2px dashed #FF69B4;border-radius:8px;background:linear-gradient(45deg,#FFB6C1,#87CEFA);user-select:none;cursor:default;">Comic Sans Edition</span>`;
                    } else {
                        titleDiv!.innerHTML = savedDiv || "";
                    }
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
