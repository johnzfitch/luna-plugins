import React from "react";

import { ReactiveStore } from "@luna/core";
import { LunaSettings, LunaSwitchSetting, LunaButtonSetting, LunaButton } from "@luna/ui";

import { setCatJamCompatible } from ".";
import { openWindow } from ".";

export const storage = ReactiveStore.getStore("LyricsEverywhere");
export const settings = await ReactiveStore.getPluginStorage("LyricsEverywhere", { catjamCompatibility: false });

export const Settings = () => {
	const [cazjamCompatibility, setCatjamCompatibility] = React.useState(settings.catjamCompatibility);
	return (
		<LunaSettings>
			<LunaSwitchSetting
				title="CatJam Compatibility"
				desc="Displays the lyrics as a speech bubble above the CatJam added by the CatJam plugin."
				tooltip="Enable CatJam compatibility"
				checked={cazjamCompatibility}
				onChange={(_, checked: boolean) => {
					setCatjamCompatibility((settings.catjamCompatibility = checked));
					setCatJamCompatible(checked);
				}}
			/>
			<LunaButtonSetting
				title="Open Lyrics Window"
				desc="Opens an external window to view lyrics."
				onClick={openWindow}
				children="Open Lyrics Window"
			/>
		</LunaSettings>
	);
};