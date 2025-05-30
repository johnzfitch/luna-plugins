import type { LunaUnload } from "@luna/core";
import { redux, MediaItem, PlayState, ipcRenderer } from "@luna/lib";
import { settings } from "./Settings";

export { Settings } from "./Settings";

document.querySelectorAll("#lyewLyrics").forEach(el => el.remove());

const style = document.createElement("style");
document.head.appendChild(style);

setCatJamCompatible(settings.catjamCompatibility);

const lyricsElement = document.createElement("div");
lyricsElement.id = "lyewLyrics";
lyricsElement.textContent = "No lyrics loaded";
document.body.appendChild(lyricsElement);

export const unloads = new Set<LunaUnload>();
unloads.add(() => {
    console.log("Unloading LyricsEverywhere");
    document.querySelectorAll("#lyewLyrics").forEach(el => el.remove());
});

let lyricsMap: Map<number, string> = new Map();

MediaItem.onMediaTransition(unloads, async (mediaItem) => {
    if (!mediaItem) return;

    const lyrics = await mediaItem.lyrics();
    if (!lyrics) {
        lyricsElement.textContent = "No lyrics loaded";
        lyricsElement.style.display = "none";
        lyricsMap = new Map();
        return;
    }

    lyricsElement.style.display = "block";
    lyricsElement.textContent = "...";

    const map = new Map<number, string>();
    for (const line of lyrics.subtitles.split("\n")) {
        const [timePart, textPart] = line.split("]");
        if (!textPart) continue;
        const [min, sec] = timePart.replace("[", "").split(":").map(Number);
        const timeInSec = Math.floor(min * 60 + sec);
        map.set(timeInSec, textPart.trim());
    }

    lyricsMap = map;
});

function getClosestTime(currentTime: number): number | null {
    let closest: number | null = null;
    let maxTime = -Infinity;

    for (const [time] of lyricsMap) {
        if (time <= currentTime && time > maxTime) {
            maxTime = time;
            closest = time;
        }
    }

    return closest;
}

ipcRenderer.on(unloads, "client.playback.playersignal", (data) => {
    const signal = data.signal;
    if (signal !== "media.currenttime") return;
    const currentTime = Math.floor(Number(data.time));
    const closest = getClosestTime(currentTime);
    if (closest !== null) {
        const line = lyricsMap.get(closest);
        if (line) lyricsElement.textContent = line;
    }
});

export async function setCatJamCompatible(enabled: boolean) {
    style.textContent = enabled ? `
        #lyewLyrics {
            position: fixed;
            bottom: 100px;
            left: 20px;
            transform: none;
            background: #ffffff;
            color: #000000;
            padding: 10px 16px;
            border: 3px solid #111;
            font-family: system-ui, sans-serif;
            font-size: 14px;
            z-index: 9999;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            white-space: normal;
            word-break: break-word;
            max-width: 50vw;
            width: fit-content;
            transition: none;
            opacity: 0.8;
            text-align: left;
        }

        #lyewLyrics::after {
            content: "";
            position: absolute;
            bottom: -10px;
            left: 20px;
            width: 0;
            height: 0;
            border: 10px solid transparent;
            border-top-color: #111;
            border-bottom: 0;
        }

        #lyewLyrics::before {
            content: "";
            position: absolute;
            bottom: -8px;
            left: 20px;
            width: 0;
            height: 0;
            border: 10px solid transparent;
            border-top-color: #ffffff;
            border-bottom: 0;
        }
    ` : `
        #lyewLyrics {
            position: fixed;
            bottom: 104px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 12px 20px;
            border: none;
            font-family: system-ui, sans-serif;
            font-size: 14px;
            z-index: 9999;
            border-radius: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            white-space: normal;
            word-break: break-word;
            max-width: 60vw;
            width: fit-content;
            opacity: 0.9;
            text-align: center;
        }

        #lyewLyrics::before,
        #lyewLyrics::after {
            display: none;
            content: none;
        }
    `;
}