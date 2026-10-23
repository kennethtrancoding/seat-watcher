import type { LinkStatus } from "../ble/transport";
import type { ProximityEstimate } from "../proximity/ProximityEstimator";
import type { Settings } from "../settings/settings";

export type AlertKind = "temperatureHigh" | "temperatureLow" | "tooFar" | "connectionLost";

/** The inputs alerting cares about. Readings are the last known values. */
export interface SeatSnapshot {
	link: LinkStatus;
	occupied: boolean;
	temperatureC: number | null;
	proximity: ProximityEstimate | null;
	/** How many other caregivers' phones the seat says are near it. Absent or 0: no one else (or the seat can't tell). */
	othersNearby?: number;
}

export function isSeatOccupied(pressure: number | null, threshold: number): boolean {
	return pressure !== null && pressure >= threshold;
}

/**
 * Which alert conditions hold right now. Nothing fires for an empty seat.
 *
 * While the link is down, readings are stale, so only 'connectionLost' can be
 * active; it uses the occupancy we saw just before the drop.
 *
 * Walking away only matters once no caregiver is left with the seat: 'tooFar'
 * waits until no other phone is near it, and a link that drops after this phone
 * walked off stays quiet if someone else was still near. A link that drops
 * while this phone was close still alerts, because then the seat itself has
 * probably stopped (lost power, say), and the others' phones can't watch it either.
 */
export function activeConditions(s: SeatSnapshot, settings: Settings): AlertKind[] {
	if (!s.occupied) return [];
	const someoneElseNear = (s.othersNearby ?? 0) > 0;
	const walkedAway = s.proximity?.isBeyond === true;
	if (s.link === "reconnecting") return walkedAway && someoneElseNear ? [] : ["connectionLost"];
	if (s.link !== "connected") return [];

	const active: AlertKind[] = [];
	if (s.temperatureC !== null && s.temperatureC > settings.maxTempC)
		active.push("temperatureHigh");
	if (s.temperatureC !== null && s.temperatureC < settings.minTempC)
		active.push("temperatureLow");
	if (walkedAway && !someoneElseNear) active.push("tooFar");
	return active;
}

/**
 * Turns active conditions into notifications without spamming.
 *
 * One rule per alert kind: notify if the condition is active and that kind
 * hasn't notified within the cooldown. So:
 *  - a new problem notifies immediately;
 *  - a problem that persists is repeated once per cooldown, as a reminder;
 *  - a reading that flickers across a threshold can't re-notify inside the cooldown.
 */
export class AlertEngine {
	private lastNotifiedAt = new Map<AlertKind, number>();

	evaluate(
		snapshot: SeatSnapshot,
		settings: Settings,
		now: number,
	): { active: AlertKind[]; notify: AlertKind[] } {
		const active = activeConditions(snapshot, settings);
		const cooldownMs = settings.alertCooldownMinutes * 60_000;
		const notify = active.filter((kind) => {
			const last = this.lastNotifiedAt.get(kind);
			return last === undefined || now - last >= cooldownMs;
		});
		for (const kind of notify) this.lastNotifiedAt.set(kind, now);
		return { active, notify };
	}

	reset(): void {
		this.lastNotifiedAt.clear();
	}
}

/** Someone got into the seat, or the seat became empty. Not an alert: just news. */
export type OccupancyChange = "seatOccupied" | "seatEmptied";

/** How long a new occupancy has to hold before it's announced. */
export const OCCUPANCY_SETTLE_MS = 3_000;

/**
 * Spots a seat changing between empty and occupied.
 *
 *  - The first reading of a connection is the starting point, so connecting to
 *    a seat that's already occupied doesn't announce anything.
 *  - A change is announced once it has held for OCCUPANCY_SETTLE_MS, so a child
 *    wriggling near the pressure threshold doesn't send a burst of notifications.
 *  - Without a fresh reading (`null`, e.g. while reconnecting) nothing changes;
 *    a seat emptied during a dropout is announced once readings come back.
 */
export class OccupancyTracker {
	private announced: boolean | null = null;
	private current: boolean | null = null;
	private since = 0;

	observe(occupied: boolean | null, now: number): OccupancyChange | null {
		if (occupied === null) return null;
		if (occupied !== this.current) {
			this.current = occupied;
			this.since = now;
		}
		if (this.announced === null) {
			this.announced = occupied;
			return null;
		}
		if (occupied === this.announced || now - this.since < OCCUPANCY_SETTLE_MS) return null;
		this.announced = occupied;
		return occupied ? "seatOccupied" : "seatEmptied";
	}

	reset(): void {
		this.announced = null;
		this.current = null;
	}
}
