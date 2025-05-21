import type { LunaUnload } from "@luna/core";
import { redux, MediaItem, PlayState, ipcRenderer } from "@luna/lib";
import * as lib from "@luna/lib";
import * as core from "@luna/core";
import * as webServer from "./native/webserver.native";

export { Settings } from "./Settings";

export const unloads = new Set<LunaUnload>();
unloads.add(() => {
    webServer.stopServer();
});

webServer.startServer(80)

export async function search(query: string) {
    // use tidals search 
}