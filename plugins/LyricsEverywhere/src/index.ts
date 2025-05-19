import type { LunaUnload } from "@luna/core";
import { redux, MediaItem, PlayState, ipcRenderer } from "@luna/lib";

// Remove any existing lyrics elements
document.querySelectorAll("#lyewLyrics").forEach(el => el.remove());

// Create and insert the lyrics display element
const lyricsElement = document.createElement("div");
lyricsElement.id = "lyewLyrics";
lyricsElement.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(60, 60, 60, 0.75);
    color: #fff;
    padding: 10px 20px;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    font-size: 1rem;
    text-align: center;
    z-index: 9999;
    max-width: 90%;
    white-space: nowrap;
`;
lyricsElement.innerHTML = `<strong>No lyrics loaded</strong>`;
document.body.appendChild(lyricsElement);

const unloads = new Set<LunaUnload>();
let lyricsMap: Map<number, string> = new Map();

unloads.add(() => {
    console.log("Unloading LyricsEverywhere");
    document.querySelectorAll("#lyewLyrics").forEach(el => el.remove());
});

redux.intercept(
    ["playbackControls/MEDIA_PRODUCT_TRANSITION", "playbackControls/SET_PLAYBACK_STATE"],
    unloads,
    async () => {
        const mediaItem = await MediaItem.fromPlaybackContext();
        if (!mediaItem) return;

        const lyrics = await mediaItem.lyrics();
        if (!lyrics) {
            lyricsElement.innerHTML = `<strong>No lyrics loaded</strong>`;
            lyricsElement.style.display = "none";
            lyricsMap = new Map();
            return;
        }
        lyricsElement.innerHTML = `...`;
        lyricsElement.style.display = "block";

        const map = new Map<number, string>();
        for (const line of lyrics.subtitles.split("\n")) {
            const [timePart, textPart] = line.split("]");
            if (!textPart) continue;
            const [min, sec] = timePart.replace("[", "").split(":").map(Number);
            const timeInSec = Math.floor(min * 60 + sec);
            map.set(timeInSec, textPart.trim());
        }

        lyricsMap = map;
    }
);


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
        if (line) lyricsElement.innerHTML = `<strong>${line}</strong>`;
    }
})