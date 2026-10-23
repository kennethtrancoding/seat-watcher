/**
 * The account: who's using this phone. The account server keeps it (see
 * server.ts); the phone keeps a copy with the seats and settings, so it can
 * greet you while logged out. Pure: no React or native imports.
 */

import { locale, strings } from "../i18n/i18n";

export type Relationship = "parent" | "grandparent" | "sitter" | "family" | "other";

export const RELATIONSHIPS: Relationship[] = ["parent", "grandparent", "sitter", "family", "other"];

/** "Grandparent", in the app's language. */
export function relationshipLabel(relationship: Relationship): string {
	return strings().account.relationships[relationship];
}

export const MAX_PROFILE_NAME_LENGTH = 40;

export interface Account {
	/** The account server's ID for it. '' in a copy saved before there was a server; it's filled in at the next launch. */
	id: string;
	/** The verified number this phone's seats and settings belong to (E.164). Kept while logged out. */
	phoneNumber: string;
	/** What to call them: "Kenneth". Empty until they say. */
	name: string;
	relationship: Relationship | null;
	/** When this account was made (ms since 1970). */
	createdAt: number;
}

export function newAccount(id: string, phoneNumber: string, now: number): Account {
	return { id, phoneNumber, name: "", relationship: null, createdAt: now };
}

export function parseAccount(stored: unknown): Account | null {
	if (typeof stored !== "object" || stored === null) return null;
	const { id, phoneNumber, name, relationship, createdAt } = stored as Record<string, unknown>;
	if (typeof phoneNumber !== "string" || !phoneNumber) return null;
	return {
		id: typeof id === "string" ? id : "",
		phoneNumber,
		name: typeof name === "string" ? name.slice(0, MAX_PROFILE_NAME_LENGTH) : "",
		relationship: RELATIONSHIPS.includes(relationship as Relationship)
			? (relationship as Relationship)
			: null,
		createdAt: typeof createdAt === "number" && Number.isFinite(createdAt) ? createdAt : 0,
	};
}

/** "Good morning, Kenneth", by the hour of the day (0–23). */
export function greeting(name: string | null, hour: number): string {
	return strings().greeting(name, hour);
}

/** "Kenneth (Grandparent)", or just the name, for the account card and invites. */
export function describeAccount(account: Pick<Account, "name" | "relationship">): string {
	if (!account.relationship) return account.name;
	const label = relationshipLabel(account.relationship);
	return account.name ? strings().account.described(account.name, label) : label;
}

/** "Oct 2026", for "On this phone since". */
export function formatMonthYear(ms: number): string {
	return new Date(ms).toLocaleDateString(locale(), { month: "short", year: "numeric" });
}
