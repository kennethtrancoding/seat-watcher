import { LANGUAGE_CHOICES, strings, type LanguageChoice } from "../i18n/i18n";

export type TemperatureUnit = "F" | "C";
export type DistanceUnit = "ft" | "m";

/** In-app text size. It multiplies the text size chosen in the iOS Settings app. */
export type TextSize = "standard" | "large" | "extraLarge";

export const TEXT_SCALE: Record<TextSize, number> = {
	standard: 1,
	large: 1.2,
	extraLarge: 1.45,
};

export const TEXT_SIZES = Object.keys(TEXT_SCALE) as TextSize[];

/**
 * Everything the user can configure. Temperatures are always stored in °C.
 * Two kinds, kept together on the phone and with the account:
 * - The settings for your own seats (SEAT_SETTING_KEYS): when they alert, and
 *   how long before your helpers hear. They go with your seats to your
 *   helpers' phones, so everyone watching a seat follows the same ones, and a
 *   seat shared with you follows its owner's (settingsForSeat in seats.ts).
 * - Everything else is this phone's own, for every seat it watches: language,
 *   text size, units, what's shown, the location shortcuts and the tuning.
 */
export interface Settings {
	maxTempC: number;
	minTempC: number;
	/** Rough separation limit, estimated from RSSI. See ProximityEstimator. */
	maxDistanceMeters: number;
	/** Pressure reading (firmware units) at or above which the seat counts as occupied. */
	occupancyPressureThreshold: number;
	/** An alert that stays active is repeated at most this often. */
	alertCooldownMinutes: number;
	/** Also send a notification when a seat goes from empty to occupied, or back. */
	notifyOccupancyChanges: boolean;
	/** RSSI calibration: signal strength with the phone 1 m from the seat. */
	rssiAt1m: number;
	pathLossExponent: number;
	temperatureUnit: TemperatureUnit;
	/** How distances are shown. They're always stored in metres. */
	distanceUnit: DistanceUnit;
	/** Use the built-in simulated seat instead of Bluetooth hardware. */
	useSimulator: boolean;
	/** Show a shortcut to Apple's Find My app (see src/locate/links.ts). */
	showFindMy: boolean;
	/** Show a shortcut to the Life360 app. */
	showLife360: boolean;
	/** Show the raw pressure reading and the occupancy threshold on the seat screen. */
	showPressure: boolean;
	/** Show the Bluetooth signal strength (RSSI, in dBm) on the seat screen. */
	showSignalStrength: boolean;
	/** Save the phone's location while connected, as the seat's last known location. See SeatLocator. */
	rememberSeatLocation: boolean;
	textSize: TextSize;
	/** Read each screen aloud when it opens (skipped while VoiceOver is on). */
	readAloud: boolean;
	/** The app's language, or 'system' for the phone's. See src/i18n/i18n.ts. */
	language: LanguageChoice;
	/** How long an alert can go unanswered before the helpers on your team are told (see src/account/team.ts). */
	backupAfterMinutes: number;
}

/** The settings for your own seats. See Settings. */
export const SEAT_SETTING_KEYS = [
	"maxTempC",
	"minTempC",
	"maxDistanceMeters",
	"occupancyPressureThreshold",
	"backupAfterMinutes",
] as const satisfies readonly (keyof Settings)[];

export type SeatSettingKey = (typeof SEAT_SETTING_KEYS)[number];

/** When a seat alerts, and how long before its owner's helpers hear: its owner's call. */
export type SeatSettings = Pick<Settings, SeatSettingKey>;

/** The settings for your own seats, out of all of them. */
export function seatSettingsOf(settings: Settings): SeatSettings {
	const picked = {} as SeatSettings;
	for (const key of SEAT_SETTING_KEYS) picked[key] = settings[key];
	return picked;
}

export function sameSeatSettings(a: SeatSettings | null, b: SeatSettings | null): boolean {
	if (!a || !b) return a === b;
	return SEAT_SETTING_KEYS.every((key) => a[key] === b[key]);
}

/** Someone else's settings for their seats, as sent or stored. Null unless every one is there and valid. */
export function parseSeatSettings(stored: unknown): SeatSettings | null {
	if (typeof stored !== "object" || stored === null) return null;
	const record = stored as Record<string, unknown>;
	const merged: Settings = { ...DEFAULT_SETTINGS };
	for (const key of SEAT_SETTING_KEYS) {
		const value = record[key];
		if (typeof value !== "number") return null;
		merged[key] = value;
	}
	const errors = validateSettings(merged);
	return SEAT_SETTING_KEYS.some((key) => errors[key]) ? null : seatSettingsOf(merged);
}

export const cToF = (c: number) => (c * 9) / 5 + 32;
export const fToC = (f: number) => ((f - 32) * 5) / 9;

export function toDisplayTemp(celsius: number, unit: TemperatureUnit): number {
	return unit === "F" ? cToF(celsius) : celsius;
}

export function fromDisplayTemp(value: number, unit: TemperatureUnit): number {
	return unit === "F" ? fToC(value) : value;
}

export function formatTemp(celsius: number, unit: TemperatureUnit, digits = 1): string {
	return `${toDisplayTemp(celsius, unit).toFixed(digits)}°${unit}`;
}

export const FEET_PER_METER = 3.28084;

export function toDisplayDistance(meters: number, unit: DistanceUnit): number {
	return unit === "ft" ? meters * FEET_PER_METER : meters;
}

export function fromDisplayDistance(value: number, unit: DistanceUnit): number {
	return unit === "ft" ? value / FEET_PER_METER : value;
}

/** "16.4 ft" or "5.0 m". */
export function formatDistance(meters: number, unit: DistanceUnit, digits = 1): string {
	return `${toDisplayDistance(meters, unit).toFixed(digits)} ${unit}`;
}

/** A whole number in a unit that suits the size: "28 ft", "0.4 mi", "8 m", "1.2 km". */
export function formatRoughDistance(meters: number, unit: DistanceUnit): string {
	if (unit === "ft") {
		const feet = meters * FEET_PER_METER;
		return feet < 1000 ? `${Math.round(feet)} ft` : `${(feet / 5280).toFixed(1)} mi`;
	}
	return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

/** Turns a typed number into a number: accepts "2,5" and a typographic minus. NaN if empty. */
export function parseNumberInput(text: string): number {
	const cleaned = text.trim().replace(",", ".").replace("−", "-");
	return cleaned === "" ? NaN : Number(cleaned);
}

/** Allowed range for maxDistanceMeters. */
export const DISTANCE_LIMIT_METERS = { min: 0.5, max: 50 };

// Prototype defaults, not medical guidance. Tune them with real data.
export const DEFAULT_SETTINGS: Settings = {
	maxTempC: fToC(95),
	minTempC: fToC(50),
	maxDistanceMeters: 5,
	occupancyPressureThreshold: 500,
	alertCooldownMinutes: 2,
	notifyOccupancyChanges: true,
	rssiAt1m: -59,
	pathLossExponent: 2.5,
	temperatureUnit: "F",
	distanceUnit: "ft",
	useSimulator: false,
	showFindMy: false,
	showLife360: false,
	showPressure: false,
	showSignalStrength: false,
	// Off until the user turns it on, so the location prompt appears in context.
	rememberSeatLocation: false,
	textSize: "standard",
	readAloud: false,
	language: "system",
	backupAfterMinutes: 5,
};

export type SettingsErrors = Partial<Record<keyof Settings, string>>;

export function validateSettings(s: Settings): SettingsErrors {
	const t = strings().settings.errors;
	const errors: SettingsErrors = {};
	const numeric: (keyof Settings)[] = [
		"maxTempC",
		"minTempC",
		"maxDistanceMeters",
		"occupancyPressureThreshold",
		"alertCooldownMinutes",
		"rssiAt1m",
		"pathLossExponent",
		"backupAfterMinutes",
	];
	for (const key of numeric) {
		if (!Number.isFinite(s[key])) errors[key] = t.number;
	}
	if (!errors.maxTempC && !errors.minTempC && s.minTempC >= s.maxTempC - 1) {
		errors.minTempC = t.temperatureGap;
	}
	const { min, max } = DISTANCE_LIMIT_METERS;
	if (!errors.maxDistanceMeters && (s.maxDistanceMeters < min || s.maxDistanceMeters > max)) {
		// In the unit the user typed in, rounded inwards so both ends are allowed.
		const low = Math.ceil(toDisplayDistance(min, s.distanceUnit) * 10) / 10;
		const high = Math.floor(toDisplayDistance(max, s.distanceUnit) * 10) / 10;
		errors.maxDistanceMeters = t.distance(low, high, s.distanceUnit);
	}
	if (!errors.occupancyPressureThreshold && s.occupancyPressureThreshold <= 0) {
		errors.occupancyPressureThreshold = t.positive;
	}
	if (
		!errors.alertCooldownMinutes &&
		(s.alertCooldownMinutes < 0.5 || s.alertCooldownMinutes > 60)
	) {
		errors.alertCooldownMinutes = t.cooldown;
	}
	if (!errors.rssiAt1m && (s.rssiAt1m < -100 || s.rssiAt1m > -20)) {
		errors.rssiAt1m = t.rssi;
	}
	if (!errors.pathLossExponent && (s.pathLossExponent < 1 || s.pathLossExponent > 6)) {
		errors.pathLossExponent = t.pathLoss;
	}
	if (!errors.backupAfterMinutes && (s.backupAfterMinutes < 1 || s.backupAfterMinutes > 60)) {
		errors.backupAfterMinutes = t.backupAfter;
	}
	return errors;
}

/**
 * What to save after an edit: the edited values that passed `validateSettings`, over the saved
 * ones. Null if that changes nothing, or if the result still isn't valid (a new maximum
 * temperature below the saved minimum, say).
 */
export function settingsToSave(
	saved: Settings,
	edited: Settings,
	errors: SettingsErrors,
): Settings | null {
	const keys = Object.keys(saved) as (keyof Settings)[];
	const next: Settings = { ...saved };
	const record = next as unknown as Record<string, unknown>;
	for (const key of keys) if (!errors[key]) record[key] = edited[key];
	const changed = keys.some((key) => next[key] !== saved[key]);
	return changed && Object.keys(validateSettings(next)).length === 0 ? next : null;
}

/** Turns whatever was stored (possibly from an older version) into valid Settings. */
export function parseStoredSettings(stored: unknown): Settings {
	if (typeof stored !== "object" || stored === null) return DEFAULT_SETTINGS;
	const merged: Settings = { ...DEFAULT_SETTINGS };
	const record = merged as unknown as Record<string, unknown>;
	for (const [key, value] of Object.entries(stored)) {
		if (key in DEFAULT_SETTINGS && typeof value === typeof record[key]) record[key] = value;
	}
	if (merged.temperatureUnit !== "F" && merged.temperatureUnit !== "C")
		merged.temperatureUnit = "F";
	if (merged.distanceUnit !== "ft" && merged.distanceUnit !== "m")
		merged.distanceUnit = DEFAULT_SETTINGS.distanceUnit;
	if (!Object.hasOwn(TEXT_SCALE, merged.textSize)) merged.textSize = DEFAULT_SETTINGS.textSize;
	if (!LANGUAGE_CHOICES.includes(merged.language)) merged.language = DEFAULT_SETTINGS.language;
	return Object.keys(validateSettings(merged)).length ? DEFAULT_SETTINGS : merged;
}
