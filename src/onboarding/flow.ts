/**
 * The order of the setup screens. Each step is a route under src/app/onboarding/.
 *
 * - 'self': a parent setting up their own seat.
 * - 'invite': someone a parent invited (say, a grandparent). The child and the
 *   seat are already set up, so they skip naming the child, connecting the
 *   seat, the alert explainers and inviting others (they have no seats of
 *   their own to share yet; they can add some, and invite people, later).
 *
 * Bluetooth is asked for right before connecting the seat, because connecting
 * needs it; notifications and location follow the connection.
 */

import { newAccount, parseAccount, type Account } from "../account/account";

export type OnboardingPath = "self" | "invite";

export type StepId =
	| "welcome"
	| "invite"
	| "comfort"
	| "sign-in"
	| "child"
	| "permission/bluetooth"
	| "seat"
	| "permission/notifications"
	| "permission/location"
	// | 'watch/temperature'
	// | 'watch/weight'
	// | 'watch/distance'
	| "practice"
	| "backup"
	| "done";

const STEPS: Record<OnboardingPath, readonly StepId[]> = {
	self: [
		"welcome",
		// "comfort",
		"sign-in",
		"child",
		"permission/bluetooth",
		"seat",
		"permission/notifications",
		"permission/location",
		// 'watch/temperature',
		// 'watch/weight',
		// 'watch/distance',
		// 'practice',
		"backup",
		"done",
	],
	invite: [
		"invite",
		"comfort",
		"sign-in",
		"permission/bluetooth",
		"permission/notifications",
		"permission/location",
		// 'practice',
		"done",
	],
};

export function stepsFor(path: OnboardingPath): readonly StepId[] {
	return STEPS[path];
}

/** The step after `current`, or null after the last one (or for a step not on this path). */
export function nextStep(path: OnboardingPath, current: StepId): StepId | null {
	const steps = STEPS[path];
	const i = steps.indexOf(current);
	return i === -1 || i === steps.length - 1 ? null : steps[i + 1];
}

/** 1-based position for the progress bar, or null for a step not on this path. */
export function stepProgress(
	path: OnboardingPath,
	current: StepId,
): { step: number; total: number } | null {
	const steps = STEPS[path];
	const i = steps.indexOf(current);
	return i === -1 ? null : { step: i + 1, total: steps.length };
}

export const stepHref = (step: StepId) => `/onboarding/${step}` as const;

/**
 * What's saved about setup and the account. Everything the user chose in
 * setup is saved in Settings and the seats.
 */
export interface OnboardingRecord {
	completed: boolean;
	/** The number that's logged in now (E.164), or null while logged out. */
	phoneNumber: string | null;
	/** Whose seats and settings these are. Kept while logged out. See src/account/account.ts. */
	account: Account | null;
}

export const NEW_ONBOARDING: OnboardingRecord = { completed: false, phoneNumber: null, account: null };

export function parseOnboardingRecord(stored: unknown): OnboardingRecord {
	if (typeof stored !== "object" || stored === null) return NEW_ONBOARDING;
	const { completed, phoneNumber, account } = stored as Record<string, unknown>;
	const loggedIn = typeof phoneNumber === "string" ? phoneNumber : null;
	return {
		completed: completed === true,
		phoneNumber: loggedIn,
		// Records from before accounts only had the number.
		account: parseAccount(account) ?? (loggedIn ? newAccount("", loggedIn, 0) : null),
	};
}
