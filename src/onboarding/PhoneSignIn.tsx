import { useState } from "react";
import { StyleSheet } from "react-native";

import {
	MAX_PROFILE_NAME_LENGTH,
	RELATIONSHIPS,
	relationshipLabel,
	type Relationship,
} from "../account/account";
import { AccountError, accountErrorMessage, type AccountData } from "../account/server";
import { OptionsField } from "../components/fields";
import { Button, Notice, TextField } from "../components/ui";
import { useStrings } from "../i18n/useStrings";
import { useMonitor } from "../monitor/MonitorProvider";
import { seatsPhrase } from "../seats/seats";
import { CODE_LENGTH, PhoneAuthError } from "./auth";
import type { StepId } from "./flow";
import { useOnboarding } from "./OnboardingProvider";
import { OnboardingScreen } from "./OnboardingScreen";
import { formatPhoneNumber, formatTypedPhoneNumber, normalizePhoneNumber } from "./phone";
import { phoneAuth as auth } from "./phoneAuth";

type Phase =
	| { name: "phone" }
	| { name: "code"; phone: string }
	| { name: "signedIn"; phone: string }
	/** In setup with nothing on the phone: bring back what's saved with the account? */
	| { name: "restore"; saved: AccountData; needsProfile: boolean }
	/** First log-in during setup: what to call them. */
	| { name: "profile" }
	/** Logged in, but the team from the invite couldn't be joined. */
	| { name: "joinFailed"; message: string; needsProfile: boolean };

/**
 * - 'setup': the setup step. Asks for a name afterwards, the first time.
 * - 'login': logging back in after logging out. Welcomes them back by name,
 *   and offers a different account (someone else's, or a new one).
 * - 'change': a new number for the account (Account › Change number).
 */
export type SignInMode = "setup" | "login" | "change";

/**
 * Logging in with a phone number and a texted code: no password to create or
 * remember. Used by the setup step (src/app/onboarding/sign-in.tsx), the login
 * screen (src/app/login.tsx), the invite page and Account › Change number.
 * What a number does on this phone is decided by OnboardingProvider.planLogin
 * (see src/account/session.ts): a number other than the phone's account
 * switches to it straight away, with no asking first.
 */
export function PhoneSignIn({
	mode = "setup",
	step,
	intro,
	onSignedIn,
}: {
	mode?: SignInMode;
	/** The setup step, for the progress bar. */
	step?: StepId;
	/** A title and explanation for the number screen in place of the usual ones (the invite page). */
	intro?: { title: string; body: string };
	/** Runs once logged in and ready to move on. The login screen needs nothing: the root layout moves on by itself. */
	onSignedIn?: () => void;
}) {
	const {
		phoneNumber,
		account,
		planLogin,
		signIn,
		switchAccount,
		restore,
		skipRestore,
		changeNumber,
		updateProfile,
	} = useOnboarding();
	const { seats } = useMonitor();
	const strings = useStrings();
	const t = strings.signIn;
	const [phase, setPhase] = useState<Phase>(
		mode === "setup" && phoneNumber
			? { name: "signedIn", phone: phoneNumber }
			: { name: "phone" },
	);
	// Logging back in: the number is probably the phone's account's, as last time.
	const [typedPhone, setTypedPhone] = useState(
		mode !== "change" && account && !phoneNumber ? formatPhoneNumber(account.phoneNumber) : "",
	);
	// On the login screen: logging in as someone other than the phone's account.
	const [otherAccount, setOtherAccount] = useState(false);
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | undefined>();
	const [busy, setBusy] = useState(false);
	const [name, setName] = useState(account?.name ?? "");
	const [relationship, setRelationship] = useState<Relationship | null>(
		account?.relationship ?? null,
	);

	/** Runs an action with the buttons disabled, showing what went wrong if it fails. */
	const run = async (action: () => Promise<void>, fallback: string = strings.team.errors.general) => {
		setBusy(true);
		setError(undefined);
		try {
			await action();
		} catch (e) {
			setError(
				e instanceof PhoneAuthError
					? e.message
					: e instanceof AccountError
						? accountErrorMessage(e)
						: fallback,
			);
		} finally {
			setBusy(false);
		}
	};

	const sendCode = (phone: string) =>
		run(async () => {
			await auth.sendCode(phone);
			setCode("");
			setPhase({ name: "code", phone });
		}, t.errors.couldntSend);

	const submitPhone = () => {
		const phone = normalizePhoneNumber(typedPhone);
		if (!phone) return setError(t.phoneHelp);
		if (mode === "change" && phone === account?.phoneNumber)
			return setError(t.errors.sameNumber);
		void sendCode(phone);
	};

	/** Logged in and ready: in setup, a new account is asked for a name next. */
	const loggedIn = (needsProfile: boolean) => {
		if (mode === "setup" && needsProfile) setPhase({ name: "profile" });
		else onSignedIn?.();
	};

	/** After logging in: say if the invite's team couldn't be joined, then move on. */
	const carryOn = (joinError: unknown, needsProfile: boolean) => {
		if (joinError) {
			setPhase({ name: "joinFailed", message: accountErrorMessage(joinError), needsProfile });
		} else {
			loggedIn(needsProfile);
		}
	};

	/** The number is verified: log in with it, switching accounts if the phone has someone else's seats. */
	const finish = async (phone: string) => {
		if (mode === "change") {
			await changeNumber(phone);
			onSignedIn?.();
			return;
		}
		if (planLogin(phone).kind === "switch") {
			// Theirs are saved with their account, and this number's come in.
			const result = await switchAccount(phone);
			// Back to their own seats: the root layout shows the main screen by itself.
			if (!result.restored) carryOn(result.joinError, !result.account.name);
			return;
		}
		const result = await signIn(phone);
		const needsProfile = !result.account.name;
		if (result.restorable) setPhase({ name: "restore", saved: result.restorable, needsProfile });
		else carryOn(result.joinError, needsProfile);
	};

	const verify = (phone: string, entered: string) =>
		run(async () => {
			if (!(await auth.verifyCode(phone, entered))) setError(t.errors.wrongCode);
			else await finish(phone);
		}, t.errors.couldntCheck);

	const chooseRestore = (saved: AccountData | null, needsProfile: boolean) =>
		run(async () => {
			const joinError = saved ? await restore(saved) : await skipRestore();
			carryOn(joinError, needsProfile);
		});

	const changeCode = (phone: string, text: string) => {
		const digits = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
		setCode(digits);
		// Check as soon as the last digit is in (iOS can also fill it from the text
		// message).
		if (digits.length === CODE_LENGTH) void verify(phone, digits);
	};

	/** Back to the number screen, with `phone` filled in (or nothing). */
	const enterNumber = (phone = "", other = otherAccount) => {
		setError(undefined);
		setTypedPhone(phone);
		setOtherAccount(other);
		setPhase({ name: "phone" });
	};

	const saveProfile = () =>
		run(async () => {
			await updateProfile({ name: name.trim(), relationship });
			onSignedIn?.();
		});

	const ownerPhone = account ? formatPhoneNumber(account.phoneNumber) : "";

	switch (phase.name) {
		case "signedIn":
			return (
				<OnboardingScreen
					step={step}
					icon="checkmark.seal.fill"
					title={t.alreadyTitle}
					body={t.alreadyBody(formatPhoneNumber(phase.phone))}
					actions={
						<>
							<Button
								title={strings.common.continue}
								disabled={busy}
								onPress={() => void run(() => finish(phase.phone))}
							/>
							<Button
								title={t.differentNumber}
								variant="secondary"
								disabled={busy}
								onPress={() => enterNumber()}
							/>
						</>
					}>
					{error ? <Notice tone="warning">{error}</Notice> : null}
				</OnboardingScreen>
			);

		case "phone": {
			const copy =
				mode === "login" && otherAccount
					? { icon: "person.crop.circle.badge.plus" as const, title: t.otherTitle, body: t.otherBody }
					: mode === "login" && intro
						? { icon: "envelope.open.fill" as const, ...intro }
						: mode === "login"
							? {
									icon: "hand.wave.fill" as const,
									title: t.welcomeBack(account?.name ?? ""),
									body: t.welcomeBackBody(
										seats.length
											? seatsPhrase(seats.map((s) => s.childName))
											: t.yourSeat,
									),
								}
							: mode === "change"
								? {
										icon: "phone.fill" as const,
										title: t.newNumberTitle,
										body: t.newNumberBody,
									}
								: {
										icon: "message.fill" as const,
										title: t.numberTitle,
										body: t.numberBody,
									};
			return (
				<OnboardingScreen
					step={step}
					icon={copy.icon}
					title={copy.title}
					body={copy.body}
					actions={
						<>
							<Button
								title={t.textMeACode}
								disabled={busy || !typedPhone.trim()}
								onPress={submitPhone}
							/>
							{mode === "login" && account ? (
								otherAccount ? (
									<Button
										title={t.logInAs(ownerPhone)}
										variant="secondary"
										disabled={busy}
										onPress={() => enterNumber(ownerPhone, false)}
									/>
								) : (
									<Button
										title={t.otherAccount}
										variant="secondary"
										disabled={busy}
										onPress={() => enterNumber("", true)}
									/>
								)
							) : null}
						</>
					}>
					<TextField
						label={mode === "change" ? t.yourNewNumber : t.yourNumber}
						value={typedPhone}
						onChangeText={(text) => setTypedPhone(formatTypedPhoneNumber(text))}
						placeholder="(555) 123-4567"
						keyboardType="phone-pad"
						textContentType="telephoneNumber"
						autoComplete="tel"
						autoFocus={mode !== "login"}
						error={error}
					/>
				</OnboardingScreen>
			);
		}

		case "code":
			return (
				<OnboardingScreen
					step={step}
					icon="ellipsis.message.fill"
					title={t.codeTitle}
					body={t.codeBody(CODE_LENGTH, formatPhoneNumber(phase.phone))}
					actions={
						<>
							<Button
								title={strings.common.continue}
								disabled={busy || code.length !== CODE_LENGTH}
								onPress={() => void verify(phase.phone, code)}
							/>
							<Button
								title={t.sendNewCode}
								variant="secondary"
								disabled={busy}
								onPress={() => void sendCode(phase.phone)}
							/>
							<Button
								title={t.differentNumber}
								variant="secondary"
								disabled={busy}
								onPress={() => enterNumber()}
							/>
						</>
					}>
					<TextField
						label={t.yourCode}
						value={code}
						onChangeText={(text) => changeCode(phase.phone, text)}
						keyboardType="number-pad"
						textContentType="oneTimeCode"
						autoComplete="sms-otp"
						maxLength={CODE_LENGTH}
						autoFocus={mode !== "login"}
						error={error}
						style={styles.code}
					/>
					{auth.notice ? <Notice tone="info">{auth.notice}</Notice> : null}
				</OnboardingScreen>
			);

		case "restore":
			return (
				<OnboardingScreen
					step={step}
					icon="arrow.clockwise.icloud.fill"
					title={t.restoreTitle(account?.name ?? "")}
					body={t.restoreBody(seatsPhrase(phase.saved.seats.map((s) => s.childName)))}
					actions={
						<>
							<Button
								title={t.restore}
								disabled={busy}
								onPress={() => void chooseRestore(phase.saved, phase.needsProfile)}
							/>
							<Button
								title={t.restoreSkip}
								variant="secondary"
								disabled={busy}
								onPress={() => void chooseRestore(null, phase.needsProfile)}
							/>
						</>
					}>
					{error ? <Notice tone="warning">{error}</Notice> : null}
				</OnboardingScreen>
			);

		case "profile":
			return (
				<OnboardingScreen
					step={step}
					icon="person.crop.circle.fill"
					title={t.profileTitle}
					body={t.profileBody}
					actions={
						<>
							<Button
								title={strings.common.continue}
								disabled={busy || !name.trim()}
								onPress={() => void saveProfile()}
							/>
							<Button
								title={strings.common.skipForNow}
								variant="secondary"
								onPress={() => onSignedIn?.()}
							/>
						</>
					}>
					<TextField
						label={strings.common.yourFirstName}
						value={name}
						onChangeText={setName}
						autoCapitalize="words"
						textContentType="givenName"
						autoComplete="given-name"
						maxLength={MAX_PROFILE_NAME_LENGTH}
						returnKeyType="done"
						error={error}
					/>
					<OptionsField label={strings.common.relationship}>
						{RELATIONSHIPS.map((r) => (
							<Button
								key={r}
								compact
								variant="secondary"
								title={relationshipLabel(r)}
								selected={relationship === r}
								onPress={() => setRelationship(relationship === r ? null : r)}
							/>
						))}
					</OptionsField>
				</OnboardingScreen>
			);

		case "joinFailed":
			return (
				<OnboardingScreen
					step={step}
					icon="exclamationmark.circle.fill"
					title={strings.team.joinFailedTitle}
					body={phase.message}
					actions={
						<Button
							title={strings.common.continue}
							onPress={() => loggedIn(phase.needsProfile)}
						/>
					}>
					<Notice tone="info">{strings.team.joinFailedBody}</Notice>
				</OnboardingScreen>
			);
	}
}

const styles = StyleSheet.create({
	code: { letterSpacing: 10, fontWeight: "600", fontVariant: ["tabular-nums"] },
});
