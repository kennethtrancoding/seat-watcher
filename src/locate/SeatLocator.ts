import type { LinkStatus } from "../ble/transport";

/**
 * Remembers where the car seat was last seen.
 *
 * The seat has no GPS. But while the phone is connected to it over Bluetooth
 * the two are within radio range of each other (roughly 10–30 m), so the
 * phone's own location is a good stand-in for the seat's. SeatLocator takes a
 * fix every `intervalMs` while connected, plus one more the moment the link
 * drops, and keeps the latest. After an alert, that's where the car is.
 *
 * Pure logic, like CarSeatMonitor: the GPS read is behind LocationProvider so
 * tests can pass a fake. The real provider is in deviceLocation.ts.
 */

export interface SeatLocation {
	latitude: number;
	longitude: number;
	/** Radius of uncertainty in metres, as reported by the phone. */
	accuracyMeters: number | null;
	/** When the fix was taken (ms since epoch). */
	timestamp: number;
}

export interface LocationProvider {
	/**
	 * The phone's current location, or null if there isn't one: no permission,
	 * no fix, or the app is in the background without "Always" location access.
	 */
	getCurrentLocation(): Promise<SeatLocation | null>;
}

export interface SeatLocatorOptions {
	provider: LocationProvider;
	/** Called with each new location, or null when it's forgotten. Used to persist it. */
	onChange?: (location: SeatLocation | null) => void;
	/** Minimum time between fixes while connected. Default 30 s. */
	intervalMs?: number;
	now?: () => number;
}

export class SeatLocator {
	private enabled = false;
	private lastSeen: SeatLocation | null = null;
	private link: LinkStatus = "idle";
	private lastRequestAt = -Infinity;
	private inFlight = false;
	private listeners = new Set<() => void>();

	constructor(private options: SeatLocatorOptions) {}

	getLastSeen = (): SeatLocation | null => this.lastSeen;

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	/** Loads a location saved by a previous run, unless a newer one was already taken. */
	restore(location: SeatLocation | null): void {
		if (!location || (this.lastSeen && this.lastSeen.timestamp >= location.timestamp)) return;
		this.lastSeen = location;
		this.listeners.forEach((l) => l());
	}

	/** Turning it off also forgets the last location. */
	setEnabled(enabled: boolean): void {
		const wasEnabled = this.enabled;
		this.enabled = enabled;
		if (!enabled) {
			if (this.lastSeen) this.set(null);
		} else if (!wasEnabled) {
			this.observe(this.link);
		}
	}

	/**
	 * Call with the link status on every monitor update. In the background iOS
	 * pauses timers but keeps waking the app for Bluetooth data, so fixes ride
	 * on those updates instead of on a timer of their own.
	 */
	observe(link: LinkStatus): void {
		// The drop is the last moment the phone is known to be near the seat.
		// A fix now catches "parked and walked straight off" between periodic fixes.
		const dropped = this.link === "connected" && link === "reconnecting";
		this.link = link;
		if (!this.enabled || this.inFlight) return;
		const intervalMs = this.options.intervalMs ?? 30_000;
		const due = link === "connected" && this.now() - this.lastRequestAt >= intervalMs;
		if (due || dropped) void this.capture();
	}

	private now(): number {
		return (this.options.now ?? Date.now)();
	}

	private async capture(): Promise<void> {
		this.inFlight = true;
		this.lastRequestAt = this.now();
		try {
			const location = await this.options.provider.getCurrentLocation();
			// Ignore a fix that finishes after the feature was turned off.
			if (location && this.enabled) this.set(location);
		} catch {
			// Keep the previous location.
		} finally {
			this.inFlight = false;
		}
	}

	private set(location: SeatLocation | null): void {
		this.lastSeen = location;
		this.options.onChange?.(location);
		this.listeners.forEach((l) => l());
	}
}

/** Validates a location read back from storage. Returns null if it's malformed. */
export function parseSeatLocation(value: unknown): SeatLocation | null {
	if (typeof value !== "object" || value === null) return null;
	const { latitude, longitude, accuracyMeters, timestamp } = value as Record<string, unknown>;
	if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude) || !isFiniteNumber(timestamp))
		return null;
	if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
	return {
		latitude,
		longitude,
		accuracyMeters: isFiniteNumber(accuracyMeters) ? accuracyMeters : null,
		timestamp,
	};
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}
