import { locale, strings } from "../i18n/i18n";
import type { Settings } from "../settings/settings";
import type { SeatLocation } from "./SeatLocator";

/**
 * Links from this app into Find My, Life360 and Apple Maps.
 *
 * Neither Apple nor Life360 has a public API, so no third-party app can read
 * locations out of them or post alerts into them. What an app can do is open
 * them, one tap away from an alert. See docs/find-my-and-life360.md.
 *
 * To add another app (Tile, Google Find Hub, ...), add an entry to
 * LOCATION_APPS, a matching `show...` boolean to Settings, and its name and
 * description to `locate.apps` in src/i18n/en.ts and es.ts.
 */

export interface LocationApp {
	/** The app's name in English. Show locationAppText(app).name, which is in the app's language. */
	name: string;
	/** The app's custom URL scheme. */
	url: string;
	/** Opened instead if the app isn't installed. If it is installed, this page offers "Open". */
	appStoreUrl: string;
	/** The setting that shows this app's shortcut. */
	setting: "showFindMy" | "showLife360";
}

export const LOCATION_APPS: readonly LocationApp[] = [
	{
		name: "Find My",
		url: "findmy://",
		appStoreUrl: "https://apps.apple.com/app/find-my/id1514844621",
		setting: "showFindMy",
	},
	{
		name: "Life360",
		// Life360 doesn't document its URL scheme. If this one stops working, the
		// button still reaches the app through its App Store page.
		url: "life360://",
		appStoreUrl: "https://apps.apple.com/app/life360-family-safety-gps/id384830320",
		setting: "showLife360",
	},
];

/**
 * The app's name as the phone shows it (Find My is "Encontrar" in Spanish),
 * and the description shown under its switch in Settings.
 */
export function locationAppText(app: LocationApp): { name: string; description: string } {
	return strings().locate.apps[app.setting];
}

/** The app shortcuts the user turned on in Settings. */
export function enabledLocationApps(settings: Settings): LocationApp[] {
	return LOCATION_APPS.filter((app) => settings[app.setting]);
}

/**
 * An Apple Maps link that drops a labelled pin. It opens Maps on an iPhone and
 * the browser anywhere else, so it works for whoever it's shared with.
 */
export function mapsUrl(
	location: Pick<SeatLocation, "latitude" | "longitude">,
	label = strings().locate.pin,
): string {
	const ll = `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
	// The classic ll + q format. Apple's newer "unified" Maps URLs need iOS 18.4+.
	return `https://maps.apple.com/?ll=${ll}&q=${encodeURIComponent(label)}`;
}

/** "2:14 PM" for today, "Sep 25, 2:14 PM" for other days (in the app's language). */
export function formatSeenAt(timestamp: number, now = Date.now()): string {
	const date = new Date(timestamp);
	const time = date.toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" });
	if (date.toDateString() === new Date(now).toDateString()) return time;
	return `${date.toLocaleDateString(locale(), { month: "short", day: "numeric" })}, ${time}`;
}

/** Text for the share sheet, e.g. to send to someone in your Life360 Circle. */
export function shareMessage(
	location: SeatLocation,
	alertLabels: readonly string[],
	seenAt: string,
): string {
	const t = strings().locate;
	const where = t.share(seenAt, mapsUrl(location));
	return alertLabels.length ? t.shareWithAlerts(alertLabels, where) : where;
}
