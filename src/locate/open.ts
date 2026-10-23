import { Linking, Share } from "react-native";

import { formatSeenAt, mapsUrl, shareMessage, type LocationApp } from "./links";
import type { SeatLocation } from "./SeatLocator";

/** Opens the app, or its App Store page if it isn't installed. */
export async function openLocationApp(app: LocationApp): Promise<void> {
	try {
		await Linking.openURL(app.url);
	} catch {
		// iOS rejects the URL when no installed app handles its scheme.
		await Linking.openURL(app.appStoreUrl).catch(() => {});
	}
}

export async function openInMaps(location: SeatLocation): Promise<void> {
	await Linking.openURL(mapsUrl(location)).catch(() => {});
}

/** Opens the share sheet (Messages, WhatsApp, ...) with a map link to the seat. */
export async function shareSeatLocation(
	location: SeatLocation,
	alertLabels: readonly string[],
): Promise<void> {
	const message = shareMessage(location, alertLabels, formatSeenAt(location.timestamp));
	await Share.share({ message }).catch(() => {});
}
