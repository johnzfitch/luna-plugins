import React from "react";

import { ReactiveStore } from "@luna/core";
import { LunaSettings, LunaSwitchSetting } from "@luna/ui";

import { replaceImagesFunc } from ".";

export const storage = ReactiveStore.getStore("UwU-ifier");
export const settings = await ReactiveStore.getPluginStorage("UwU-ifier", { replaceImages: true });

export const Settings = () => {
	const [replaceImages, setReplaceImages] = React.useState(settings.replaceImages);
	return (
		<LunaSettings>
			<LunaSwitchSetting
				title="Replace Images"
				desc="Replaces all images with random Nekos from nekos.life."
				tooltip="Enable replacing images"
				checked={replaceImages}
				onChange={(_, checked: boolean) => {
					setReplaceImages((settings.replaceImages = checked));
					if (checked) replaceImagesFunc();
				}}
			/>
		</LunaSettings>
	);
};