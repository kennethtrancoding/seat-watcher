import { MAX_PROFILE_NAME_LENGTH } from "../account/account";
import { cleanInviteCode } from "../account/team";
import { strings } from "../i18n/i18n";
import { MAX_CHILD_NAME_LENGTH, MAX_SEATS, seatsPhrase } from "../seats/seats";

/**
 * Invite links let a parent bring in another caregiver. The link carries the
 * invite's code, which the account server made (see src/account/server.ts),
 * and what the parent already set up: the children's names (one per seat) and
 * who sent it, so the invite page can say who's asking before anyone logs in.
 *
 *   carseatmonitor://invite?code=K7M2QX&child=Emma&child=Leo&from=Kenneth
 *
 * It opens the invite page (src/app/invite.tsx) whether or not the phone is
 * set up (Expo Router turns the path into the route and the query into search
 * params). Links from before, under /onboarding/invite and maybe without a
 * code, are sent there too (src/app/+native-intent.tsx). The seat hardware
 * isn't in the link: each phone pairs with the seats itself.
 */

export interface Invite {
	/** The invite's code on the account server. '' in a link from before invites had codes. */
	code: string;
	/** One per seat, in the parent's order. */
	childNames: string[];
	/** The parent's name, if they gave one. */
	from: string;
}

const INVITE_LINK = "carseatmonitor://invite";
/** Where invite links used to point. Still read, and sent to the invite page. */
const OLD_INVITE_LINK = "carseatmonitor://onboarding/invite";

/** The link for an invite. `base` swaps the start, e.g. for an in-app route. */
export function inviteUrl(invite: Invite, base = INVITE_LINK): string {
	const params = invite.childNames.map((name) => `child=${encodeURIComponent(name)}`);
	if (invite.code) params.unshift(`code=${invite.code}`);
	if (invite.from) params.push(`from=${encodeURIComponent(invite.from)}`);
	return `${base}?${params.join("&")}`;
}

/** The message the parent sends, in the parent's language, ready for Messages. */
export function inviteMessage(invite: Invite): string {
	const seats = seatsPhrase(invite.childNames.length ? invite.childNames : [""]);
	return strings().invite.message(invite.from, seats, inviteUrl(invite));
}

/**
 * Where a link the system opened the app with should go: invite links from
 * before, at /onboarding/invite, go to the invite page like new ones. That
 * page works whether or not the phone is set up; /onboarding/invite only
 * exists during setup. Anything else is left as it is.
 */
export function redirectInviteLink(path: string): string {
	const match = /^(?:carseatmonitor:\/\/\/?|\/)?onboarding\/invite\/?(?=[?#]|$)/.exec(path);
	return match ? `/invite${path.slice(match[0].length)}` : path;
}

const cleanName = (value: unknown, max: number): string | null => {
	if (typeof value !== "string") return null;
	const name = value.trim();
	return name && name.length <= max ? name : null;
};

/**
 * Validates the params from an invite link: `code`, `child` (one string, or an
 * array when there are several) and `from`. Null without a usable child name,
 * or with a code the account server couldn't have made. A link without a code
 * (from before invites had them) is fine.
 */
export function inviteFromParams(code: unknown, child: unknown, from?: unknown): Invite | null {
	const cleanCode = code === undefined || code === null || code === "" ? "" : cleanInviteCode(code);
	const raw = Array.isArray(child) ? child : [child];
	const childNames = raw.map((c) => cleanName(c, MAX_CHILD_NAME_LENGTH));
	if (cleanCode === null || !childNames.length || childNames.length > MAX_SEATS || childNames.some((c) => c === null))
		return null;
	return {
		code: cleanCode,
		childNames: childNames as string[],
		from: cleanName(from, MAX_PROFILE_NAME_LENGTH) ?? "",
	};
}

/** Finds an invite link in pasted text (the whole message is fine) and reads it. */
export function parseInvite(text: string): Invite | null {
	const starts = [text.indexOf(INVITE_LINK), text.indexOf(OLD_INVITE_LINK)].filter((i) => i !== -1);
	if (!starts.length) return null;
	const link = text.slice(Math.min(...starts)).split(/\s/)[0];
	const query = link.split("?")[1] ?? "";
	const children: string[] = [];
	let from: string | undefined;
	let code: string | undefined;
	for (const pair of query.split("&")) {
		const [key, value = ""] = pair.split("=");
		let decoded: string;
		try {
			decoded = decodeURIComponent(value.replace(/\+/g, " "));
		} catch {
			return null; // malformed %-escape
		}
		if (key === "child") children.push(decoded);
		else if (key === "from") from = decoded;
		else if (key === "code") code = decoded;
	}
	return inviteFromParams(code, children, from);
}
