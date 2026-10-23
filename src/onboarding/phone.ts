/**
 * Phone numbers as typed or picked from Contacts, e.g. "(555) 123-4567",
 * "555.123.4567", "+44 20 7946 0958", turned into E.164 (+15551234567). Numbers
 * without a country code are taken as US/Canada.
 */
export function normalizePhoneNumber(input: string): string | null {
	const trimmed = input.trim();
	const digits = trimmed.replace(/\D/g, "");
	if (trimmed.startsWith("+")) {
		return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
	}
	if (digits.length === 10) return `+1${digits}`;
	if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
	return null;
}

/** "+15551234567" → "(555) 123-4567", for showing a saved number. Other countries are shown as stored. */
export function formatPhoneNumber(e164: string): string {
	const us = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
	return us ? `(${us[1]}) ${us[2]}-${us[3]}` : e164;
}

/**
 * A phone number as it's being typed: "5551234" → "(555) 123-4",
 * "15551234567" → "1 (555) 123-4567", "+1 555 123 4567" → "+1 (555) 123-4567".
 * A number for another country (after a +) is kept as digits. Anything
 * longer than a US number is left alone, so it's plain that it doesn't fit.
 *
 * Brackets, spaces and dashes only appear once a digit follows them, so the
 * last character is always a digit and backspace always takes one away.
 * normalizePhoneNumber reads every result.
 */
export function formatTypedPhoneNumber(text: string): string {
	let digits = text.replace(/\D/g, "");
	let prefix = "";
	if (text.trimStart().startsWith("+")) {
		if (!digits.startsWith("1")) return `+${digits}`;
		prefix = "+1";
		digits = digits.slice(1);
	} else if (digits.startsWith("1")) {
		// US area codes never start with 1, so a leading 1 is the country code.
		prefix = "1";
		digits = digits.slice(1);
	}
	if (digits.length > 10) return `${prefix}${digits}`;
	const national =
		digits.length <= 3
			? digits
			: digits.length <= 6
				? `(${digits.slice(0, 3)}) ${digits.slice(3)}`
				: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
	return prefix && national ? `${prefix} ${national}` : prefix || national;
}
