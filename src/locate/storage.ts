import AsyncStorage from "@react-native-async-storage/async-storage";

import { parseSeatLocation, type SeatLocation } from "./SeatLocator";

const KEY = "carSeatMonitor.lastSeen.v2";
// Before more than one seat: a single location, which belongs to the first seat.
const OLD_KEY = "carSeatMonitor.lastSeen.v1";
const FIRST_SEAT_ID = "seat-1";

/** Where each seat was last seen, by seat ID. */
export async function loadLastSeen(): Promise<Record<string, SeatLocation>> {
	try {
		const raw = await AsyncStorage.getItem(KEY);
		if (raw) return parseLocations(JSON.parse(raw));
		const old = await AsyncStorage.getItem(OLD_KEY);
		const location = old ? parseSeatLocation(JSON.parse(old)) : null;
		return location ? { [FIRST_SEAT_ID]: location } : {};
	} catch {
		return {};
	}
}

export async function saveLastSeen(locations: Readonly<Record<string, SeatLocation>>): Promise<void> {
	await AsyncStorage.setItem(KEY, JSON.stringify(locations));
}

function parseLocations(stored: unknown): Record<string, SeatLocation> {
	if (typeof stored !== "object" || stored === null) return {};
	const locations: Record<string, SeatLocation> = {};
	for (const [id, value] of Object.entries(stored)) {
		const location = parseSeatLocation(value);
		if (location) locations[id] = location;
	}
	return locations;
}
