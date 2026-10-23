import type { LinkStatus } from "../ble/transport";
import { strings } from "../i18n/i18n";
import { seatName, seatTitle } from "../seats/seats";
import { formatRoughDistance, formatTemp, type Settings } from "../settings/settings";
import type { AlertKind, OccupancyChange, SeatSnapshot } from "./AlertEngine";
import { greeting } from "../account/account";

export interface AlertMessage {
	title: string;
	body: string;
}

export { seatName };

/**
 * The notification for `kind` on the seat of the child called `childName` (''
 * if unnamed), in the app's language. Short and warm, but these are safety
 * alerts: each one says plainly what's wrong and what to do.
 */
export function alertMessage(
	kind: AlertKind,
	s: SeatSnapshot,
	settings: Settings,
	childName: string,
): AlertMessage {
	const t = strings().alerts;
	const temp = s.temperatureC === null ? t.unknown : formatTemp(s.temperatureC, settings.temperatureUnit);

	switch (kind) {
		case "temperatureHigh":
			return t.tooHot(childName, temp);
		case "temperatureLow":
			return t.tooCold(childName, temp);
		case "tooFar":
			return t.tooFar(childName, formatRoughDistance(s.proximity?.distanceMeters ?? 0, settings.distanceUnit));
		case "connectionLost":
			return t.connectionLost(childName);
	}
}

/**
 * The notification for a seat that just became occupied or empty. `userName` is
 * the account's name ('' if unnamed) and `hour` the hour of the day (0–23), for
 * the greeting.
 */
export function occupancyMessage(
	change: OccupancyChange,
	childName: string,
	userName: string,
	hour: number,
): AlertMessage {
	const t = strings().alerts;
	switch (change) {
		case "seatOccupied":
			return { title: greeting(null, hour), body: t.buckledIn(childName) };
		case "seatEmptied":
			return { title: greeting(null, hour), body: t.outOfSeat(childName) };
	}
}

/** The onboarding practice alert: looks like a real "too hot" alert, but says
 * it's practice. */
export function practiceAlertMessage(childName: string): AlertMessage {
	return strings().alerts.practice(childName);
}

/** A short name for an alert: "Too hot". */
export function alertLabel(kind: AlertKind): string {
	return strings().alerts.labels[kind];
}

export type StatusTone = "ok" | "attention" | "neutral";

/** The one-line status at the top of the main screen, e.g. "Emma's seat:
 * looking good". */
export function seatStatus(
	s: { link: LinkStatus; activeAlerts: readonly AlertKind[] },
	childName: string,
): { text: string; tone: StatusTone } {
	const t = strings().status;
	const line = (status: string, tone: StatusTone) => ({ text: `${seatTitle(childName)}: ${status}`, tone });
	if (s.activeAlerts.length > 0) return line(t.needsYou, "attention");
	switch (s.link) {
		case "connected":
			return line(t.lookingGood, "ok");
		case "reconnecting":
			return line(t.lostTouch, "attention");
		case "scanning":
		case "connecting":
			return line(t.connecting, "neutral");
		case "waiting":
			return line(t.waiting, "neutral");
		case "idle":
			return line(t.notConnected, "neutral");
	}
}
