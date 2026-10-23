import { Platform, Settings } from "react-native";

import { loadIfNative } from "../native/optionalModule";

type LocalizationModule = typeof import("expo-localization");

const Localization = loadIfNative(
	"ExpoLocalization",
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	() => require("expo-localization") as LocalizationModule,
);

/**
 * The phone's preferred languages, most preferred first, e.g. ['es-MX', 'en-US'].
 * On iOS that starts with the language picked for this app alone (Settings ›
 * Seat Watcher › Language), if there is one. iOS restarts the app when
 * either changes, so reading it at startup is enough.
 */
export function phoneLanguages(): string[] {
	if (Localization) return Localization.getLocales().map((l) => l.languageTag);
	// A development build made before expo-localization was added. iOS keeps the
	// same list in the app's user defaults; elsewhere, Intl knows the main language.
	const apple = Platform.OS === "ios" ? Settings.get("AppleLanguages") : null;
	if (Array.isArray(apple) && apple.every((tag) => typeof tag === "string")) return apple;
	return [Intl.DateTimeFormat().resolvedOptions().locale];
}
