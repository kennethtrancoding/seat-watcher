import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, Linking } from "react-native";

import type { SFSymbol } from "expo-symbols";

import { CRITICAL_ALERTS_BUILD } from "../../../alerts/notifier";
import type { BluetoothAccess } from "../../../ble/transport";
import { Button, Notice } from "../../../components/ui";
import type { Strings } from "../../../i18n/i18n";
import { useStrings } from "../../../i18n/useStrings";
import {
	getLocationAccess,
	requestLocationAccess,
	type LocationAccess,
} from "../../../locate/deviceLocation";
import { requestBluetoothAccess } from "../../../monitor/createTransport";
import { useMonitor } from "../../../monitor/MonitorProvider";
import type { StepId } from "../../../onboarding/flow";
import { useOnboarding } from "../../../onboarding/OnboardingProvider";
import { OnboardingScreen } from "../../../onboarding/OnboardingScreen";

type Kind = "bluetooth" | "notifications" | "location";

/**
 * - 'asking': the reason, before the iOS prompt.
 * - 'allowed' / 'partial' / 'declined': what happened, with one tap to fix it.
 *   'partial' is location "While Using", or notifications without critical alerts.
 * - 'notNeeded': no Bluetooth in this build, or the simulated seat is on.
 */
type Outcome = "asking" | "allowed" | "partial" | "declined" | "off" | "notNeeded";

const ICONS: Record<Kind, SFSymbol> = {
	bluetooth: "antenna.radiowaves.left.and.right",
	notifications: "bell.badge.fill",
	location: "location.fill",
};

function copyFor(kind: Kind, t: Strings) {
	const p = t.onboarding.permission;
	switch (kind) {
		case "bluetooth":
			return { ...p.bluetooth, partial: undefined };
		case "notifications":
			return {
				...p.notifications,
				// iOS asks about critical alerts in a second prompt, right after the first.
				reason: CRITICAL_ALERTS_BUILD ? p.notifications.reasonWithCriticalAlerts : p.notifications.reason,
			};
		case "location":
			return p.location;
	}
}

function bluetoothOutcome(access: BluetoothAccess): Outcome {
	return access === "allowed"
		? "allowed"
		: access === "off"
			? "off"
			: access === "denied"
				? "declined"
				: "notNeeded";
}

function locationOutcome(access: LocationAccess): Outcome {
	return access === "always"
		? "allowed"
		: access === "whenInUse"
			? "partial"
			: access === "denied"
				? "declined"
				: "asking";
}

/** One permission per screen, each explained before the iOS prompt appears. */
export default function PermissionScreen() {
	const param = useLocalSearchParams<{ kind: Kind }>().kind;
	const kind: Kind = param in ICONS ? param : "notifications";
	const t = useStrings();
	const copy = { icon: ICONS[kind], ...copyFor(kind, t) };
	const step = `permission/${kind}` as StepId;
	const { goNext } = useOnboarding();
	const { settings, saveSettings, requestNotifications, notificationsAllowed, criticalAlerts } = useMonitor();
	const [outcome, setOutcome] = useState<Outcome>(() =>
		kind === "bluetooth" && settings.useSimulator ? "notNeeded" : "asking",
	);

	// Show location access that's already been decided, and changes made in the
	// Settings app after "Open Settings", without prompting. (MonitorProvider
	// keeps notificationsAllowed current; Bluetooth can't be read without prompting.)
	useEffect(() => {
		if (kind !== "location") return;
		const check = () =>
			getLocationAccess()
				.then((access) => {
					if (access !== "undetermined") setOutcome(locationOutcome(access));
				})
				.catch(() => {});
		void check();
		const sub = AppState.addEventListener("change", (next) => {
			if (next === "active") void check();
		});
		return () => sub.remove();
	}, [kind]);

	const ask = async () => {
		if (kind === "bluetooth") {
			// There's no way to read this without prompting, so a Bluetooth recheck
			// after "Open Settings" happens by tapping Try again.
			setOutcome(
				bluetoothOutcome(
					await requestBluetoothAccess().catch((): BluetoothAccess => "unavailable"),
				),
			);
		} else if (kind === "notifications") {
			setOutcome((await requestNotifications()).allowed ? "allowed" : "declined");
		} else {
			const access = await requestLocationAccess().catch((): LocationAccess => "denied");
			setOutcome(locationOutcome(access));
			// Location is what the "last seen" feature runs on, so turn it on with it.
			const usable = access === "always" || access === "whenInUse";
			if (usable !== settings.rememberSeatLocation)
				await saveSettings({ ...settings, rememberSeatLocation: usable });
		}
	};

	const next = () => goNext(step);
	const openSettings = () => void Linking.openSettings();

	// Once notifications are allowed, MonitorProvider's copy of the permission
	// decides. Critical alerts have their own prompt, so someone who allowed
	// notifications in a build without them is asked (once) for those.
	const shown: Outcome =
		kind === "notifications" && notificationsAllowed
			? criticalAlerts === "off"
				? "partial"
				: criticalAlerts === "notAsked" && outcome === "asking"
					? "asking"
					: "allowed"
			: outcome;

	switch (shown) {
		case "asking":
			return (
				<OnboardingScreen
					step={step}
					icon={copy.icon}
					title={copy.title}
					body={copy.reason}
					// The iOS prompt has its own "Don't Allow", which leads to 'declined'.
					actions={<Button title={copy.allow} onPress={() => void ask()} />}
				/>
			);
		case "allowed":
			return (
				<OnboardingScreen
					step={step}
					icon={copy.icon}
					title={copy.title}
					body={copy.reason}
					actions={<Button title={t.common.continue} onPress={next} />}>
					<Notice tone="ok">{t.onboarding.permission.allowed}</Notice>
				</OnboardingScreen>
			);
		case "partial":
			return (
				<OnboardingScreen
					step={step}
					icon={copy.icon}
					title={copy.title}
					body={copy.reason}
					actions={<Button title={t.common.continue} onPress={next} />}>
					<Notice
						tone="warning"
						actions={
							<Button
								title={t.common.openSettings}
								variant="secondary"
								onPress={openSettings}
							/>
						}>
						{copy.partial ?? ""}
					</Notice>
				</OnboardingScreen>
			);
		case "off":
			return (
				<OnboardingScreen
					step={step}
					icon={copy.icon}
					title={copy.title}
					body={copy.reason}
					actions={<Button title={t.common.continue} onPress={next} />}>
					<Notice
						tone="warning"
						actions={
							<Button
								title={t.common.tryAgain}
								variant="secondary"
								onPress={() => void ask()}
							/>
						}>
						{t.onboarding.permission.bluetoothOff}
					</Notice>
				</OnboardingScreen>
			);
		case "declined":
			return (
				<OnboardingScreen
					step={step}
					icon={copy.icon}
					title={copy.title}
					body={copy.reason}
					actions={<Button title={t.common.skipForNow} onPress={next} />}>
					<Notice
						tone="warning"
						actions={
							<>
								<Button
									title={t.common.openSettings}
									variant="secondary"
									onPress={openSettings}
								/>
								{kind === "bluetooth" && (
									<Button
										title={t.common.tryAgain}
										variant="secondary"
										onPress={() => void ask()}
									/>
								)}
							</>
						}>
						{copy.declined}
					</Notice>
				</OnboardingScreen>
			);
		case "notNeeded":
			return (
				<OnboardingScreen
					step={step}
					icon={copy.icon}
					title={copy.title}
					body={copy.reason}
					actions={<Button title={t.common.continue} onPress={next} />}>
					{settings.useSimulator ? (
						<Notice tone="info">{t.onboarding.permission.simulatorOn}</Notice>
					) : (
						<Notice
							tone="info"
							actions={
								<Button
									title={t.common.useSimulatedSeat}
									variant="secondary"
									onPress={() =>
										void saveSettings({ ...settings, useSimulator: true })
									}
								/>
							}>
							{t.onboarding.permission.noBluetoothHere}
						</Notice>
					)}
				</OnboardingScreen>
			);
	}
}
