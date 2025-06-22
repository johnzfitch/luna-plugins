import { LunaUnload, Tracer } from "@luna/core";
import { settings } from "./Settings";

export { Settings } from "./Settings";

export const unloads = new Set<LunaUnload>();
export const { trace, errSignal } = Tracer("[CustomFonts]");

const style = document.createElement("style");
document.head.appendChild(style);

// --- Font Test Helper ---
function testFontAvailability(font: string): boolean {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const testText = "abcdefghijklmnopqrstuvwxyz0123456789";
    ctx.font = `72px "${font}", monospace`;
    const testWidth = ctx.measureText(testText).width;

    ctx.font = `72px monospace`;
    const fallbackWidth = ctx.measureText(testText).width;

    return testWidth !== fallbackWidth;
}

// --- System Fonts (Built-in) ---
const systemFonts = [
    // Windows common fonts
    "Arial", "Verdana", "Helvetica", "Times New Roman", "Courier New", "Georgia", "Palatino",
    "Garamond", "Comic Sans MS", "Trebuchet MS", "Impact", "Lucida Console", "Segoe UI",
    "Tahoma", "Candara", "Franklin Gothic Medium", "Gill Sans", "Constantia", "Corbel",
    "Consolas", "MS Sans Serif", "MS Serif", "Cambria", "Calibri", "Segoe Print", "Segoe Script",

    // macOS common fonts
    "Optima", "Futura", "Geneva", "Lucida Grande", "Menlo", "Monaco", "American Typewriter",
    "Herculanum", "Didot", "Zapfino", "Brush Script MT", "Copperplate", "Hoefler Text",
    "Charter", "Arial Black", "Marker Felt",

    // Linux common fonts (widely available or default in distros)
    "DejaVu Sans", "DejaVu Serif", "DejaVu Sans Mono",
    "Liberation Sans", "Liberation Serif", "Liberation Mono",
    "Ubuntu", "Ubuntu Mono",
    "Cantarell",
    "Noto Sans", "Noto Serif", "Noto Mono",
    "Droid Sans", "Droid Serif", "Droid Sans Mono",
    "FreeSans", "FreeSerif", "FreeMono",

    // Cross-platform common generic fonts
    "sans-serif", "serif", "monospace", "cursive", "fantasy"
];


// --- Font Cache ---
const FONT_CACHE_KEY = "available_fonts_cache_v1";
const FONT_CACHE_TIMESTAMP_KEY = "available_fonts_cache_ts";

function loadFontCache(): string[] {
    try {
        const data = localStorage.getItem(FONT_CACHE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function isFontCacheStale(): boolean {
    const now = Date.now();
    const timestamp = parseInt(localStorage.getItem(FONT_CACHE_TIMESTAMP_KEY) ?? "0");
    const maxAge = 1000 * 60 * 60 * 24 * 7; // 7 days
    return now - timestamp > maxAge;
}

function saveFontCache(fonts: string[]) {
    try {
        localStorage.setItem(FONT_CACHE_KEY, JSON.stringify(fonts));
        localStorage.setItem(FONT_CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch {}
}

function clearFontCache() {
    localStorage.removeItem(FONT_CACHE_KEY);
    localStorage.removeItem(FONT_CACHE_TIMESTAMP_KEY);
}

// --- Main Font List Function ---
export async function getAvailableFonts(): Promise<string[]> {
    const cachedFonts = loadFontCache();
    if (cachedFonts.length > 0 && !isFontCacheStale()) {
        trace.msg.log("Using cached font list");
        return cachedFonts;
    }

    const availableFonts = new Set<string>();

    // Test local/system fonts
    for (const font of systemFonts) {
        if (testFontAvailability(font)) {
            availableFonts.add(font);
        }
    }

    const result = Array.from(availableFonts).sort();
    saveFontCache(result);
    return result;
}

// --- Exposed Reload Trigger ---
export async function updateFonts(): Promise<void> {
    trace.msg.log("Updating font list...");
    clearFontCache();
    const fonts = await getAvailableFonts();
    trace.msg.log(`Available fonts: ${fonts.join(", ")}`);
}

// --- Font Applier ---
export async function updateFont() {
    const font = settings.fontName;
    if (!font) {
        style.textContent = ``;
        return;
    }

    await document.fonts.ready;

    if (!document.fonts.check(`12px "${font}"`)) {
        trace.msg.err(`Font "${font}" is not available. Please ensure it is installed on the system.`);
        return;
    }

    style.textContent = `
        * {
            font-family: "${font}" !important;
        }
    `;
}

updateFont().catch(err => {
    trace.msg.err("Error updating font:", err);
});

unloads.add(() => {
    style.remove();
});
