import type { LunaUnload } from "@luna/core";
import { redux, MediaItem, PlayState } from "@luna/lib";

let addedElement: HTMLDivElement | null = null;
let observer: MutationObserver | null = null;

let clicks: number = 0;


function createTimeBox(): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.id = "totalPlayTimeParent";
    wrapper.style.padding = "3px 6px";
    wrapper.style.borderRadius = "10px";
    wrapper.style.fontSize = "12px";
    wrapper.style.backgroundColor = "color-mix(in srgb, var(--wave-color-solid-base-brighter), transparent 70%) !important"
    wrapper.style.color = "#fff";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.marginRight = "4px";
    wrapper.style.minWidth = "48px";

    wrapper.title = "Total Play Time of Remaining Queue";
    wrapper.style.cursor = "pointer";

    wrapper.addEventListener("click", () => {
        clicks++;
        if (clicks >= 5) {
            clicks = 0;
            alert("Why the hell are you clicking me????????")
        }
    });

    const timeElement = document.createElement("div");
    timeElement.id = "totalPlayTime";
    timeElement.style.fontWeight = "bold";
    timeElement.style.fontSize = "12px";
    timeElement.style.textAlign = "center";

    wrapper.appendChild(timeElement);
    return wrapper;
}

async function updateTotalPlayTime() {
    const timeElement = addedElement?.querySelector("#totalPlayTime") as HTMLDivElement | null;
    if (!timeElement) return;

    const queue = await PlayState.playQueue.elements;
    if (!queue || queue.length === 0) return;

    let index = PlayState.playQueue.currentIndex;
    let totalPlayTime = 0;

    for (let i = index; i < queue.length; i++) {
        const item = queue[i];
        if (!item) continue;
        const mediaItem = await MediaItem.fromId(item.mediaItemId);
        if (!mediaItem) continue;
        const duration = await mediaItem.duration;
        if (duration) totalPlayTime += duration;
    }

    const formatted = totalPlayTime >= 3600
        ? new Date(totalPlayTime * 1000).toISOString().substr(11, 8)
        : new Date(totalPlayTime * 1000).toISOString().substr(14, 5);

    timeElement.textContent = formatted;
}

export const unloads = new Set<LunaUnload>();

unloads.add(() => {
    console.log("Unloading TotalPlayTime");

    if (addedElement && addedElement.parentElement) {
        addedElement.parentElement.removeChild(addedElement);
    }
    addedElement = null;

    if (observer) {
        observer.disconnect();
        observer = null;
    }
});

observer = new MutationObserver(() => {
    const container = document.querySelector("._moreContainer_f6162c8") as HTMLDivElement;
    if (!container || addedElement) return;

    addedElement = createTimeBox();
    container.prepend(addedElement);
    updateTotalPlayTime();
    MediaItem.onMediaTransition(unloads, () => updateTotalPlayTime());
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});
