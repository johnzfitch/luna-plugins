import { app, BrowserWindow, ipcMain, shell } from "electron";
import lyricsHtml from "file://lyrics.html?base64&minify";
import preloadCode from "file://lyricsWindow.preload.js";
import { rm, writeFile } from "fs/promises";
import path from "path";

let win: BrowserWindow | null = null;
export const openLyricsWindow = async () => {
	if (win && !win.isDestroyed()) return win.focus();
    const preloadPath = path.join(app.getPath("temp"), `${Math.random().toString()}.preload.js`);
    try {
        await writeFile(preloadPath, preloadCode, "utf-8");
        win = new BrowserWindow({
            width: 700,
            height: 380,
            minWidth: 320,
            minHeight: 380,
            transparent: true,
            frame: false,
            resizable: true,
			webPreferences: {
                preload: preloadPath,
			},
			autoHideMenuBar: true,
        });

        await win.loadURL(`data:text/html;base64,${lyricsHtml}`);
    } catch (error) {
        console.error("Failed to create lyrics window:", error);
        return null;
    }
}

export const closeWindow = async () => {
	if (win && !win.isDestroyed()) win.close();
};

export const sendIPC = (channel: string, data: any) => {
    if (win && !win.isDestroyed()) {
        win.webContents.send(channel, data);
    }
}