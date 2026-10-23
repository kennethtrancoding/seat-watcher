import { ScreenScrollView } from "../components/ScreenScrollView";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { speak } from "../comfort/speech";
import { Hint, OptionsField, SwitchField } from "../components/fields";
import { describeAccount } from "../account/account";
import { teamCounts, teamOwner } from "../account/team";
import { useTeam } from "../account/TeamProvider";
import { Button, CardTitle, SPACE, Section, SectionTitle, Text, colors } from "../components/ui";
import { LANGUAGE_CHOICES, LANGUAGE_NAMES } from "../i18n/i18n";
import { useStrings } from "../i18n/useStrings";
import {
	getLocationAccess,
	requestLocationAccess,
	type LocationAccess,
} from "../locate/deviceLocation";
import { LOCATION_APPS, locationAppText } from "../locate/links";
import { useMonitor } from "../monitor/MonitorProvider";
import { useOnboarding } from "../onboarding/OnboardingProvider";
import { formatPhoneNumber } from "../onboarding/phone";
import { ownSeats, seatsPhrase } from "../seats/seats";
import { TEXT_SIZES, formatDistance, formatTemp, type Settings } from "../settings/settings";

/**
 * Settings, in two parts. First the settings for your own seats, which go
 * with them to your helpers' phones: a summary here, and their own screen
 * (seat-settings.tsx), with your team. Then the rest, which are this phone's
 * alone, for every seat it watches. Everything saves as soon as it's tapped.
 * The tuning and calibration settings, and Restore defaults, are on the
 * Developer screen.
 */
export default function SettingsScreen() {
	const { settings, saveSettings, seats } = useMonitor();
	const { account, phoneNumber } = useOnboarding();
	const { ownTeam, helping } = useTeam();
	const t = useStrings();
	const [locationAccess, setLocationAccess] = useState<LocationAccess | null>(null);

	useEffect(() => {
		getLocationAccess()
			.then(setLocationAccess)
			.catch(() => {});
	}, []);

	/** Saves a tapped change straight away. */
	const apply = (changes: Partial<Settings>) => void saveSettings({ ...settings, ...changes });

	const setReadAloud = (readAloud: boolean) => {
		apply({ readAloud });
		if (readAloud) void speak(t.common.readAloudOn);
	};

	// Ask for location access when the switch is turned on, so the prompt has
	// context.
	const toggleSeatLocation = async (on: boolean) => {
		if (!on) return apply({ rememberSeatLocation: false });
		const access = await requestLocationAccess().catch((): LocationAccess => "denied");
		setLocationAccess(access);
		if (access === "always" || access === "whenInUse") apply({ rememberSeatLocation: true });
	};

	const mine = ownSeats(seats);
	const { helpers, waiting } = teamCounts(ownTeam);
	const owners = helping.map((team) => teamOwner(team)?.name ?? "");
	// Someone who only helps others, with no seats or team of their own yet.
	const onlyHelping = owners.length > 0 && !ownTeam && mine.length === 0;
	const teamSummary = onlyHelping
		? t.team.helperSummary(owners)
		: [t.team.summary(helpers, waiting), owners.length ? t.team.alsoHelping(owners) : ""]
				.filter(Boolean)
				.join(" ");

	const tempUnit = settings.temperatureUnit;
	const distanceUnit = settings.distanceUnit;

	const seatLocationHint = !settings.rememberSeatLocation
		? t.settings.rememberLocationOff
		: locationAccess === "whenInUse"
			? t.settings.rememberLocationWhileOpen
			: t.settings.rememberLocationOn;

	return (
		<View style={styles.screen}>
			<ScreenScrollView
				contentContainerStyle={styles.content}
				automaticallyAdjustKeyboardInsets
				keyboardDismissMode="interactive"
				keyboardShouldPersistTaps="handled">
				<Section>
					<CardTitle icon="person.crop.circle.fill">
						{account?.name ? describeAccount(account) : t.settings.yourAccount}
					</CardTitle>
					<Text style={styles.account}>
						{phoneNumber
							? t.settings.loggedInAs(formatPhoneNumber(phoneNumber))
							: t.settings.notLoggedIn}
					</Text>
					<Button
						compact
						variant="secondary"
						icon="person.text.rectangle"
						title={t.settings.accountAndLogOut}
						onPress={() => router.push("/account")}
					/>
				</Section>

				<SectionTitle>{t.settings.yourSeats}</SectionTitle>
				<Section>
					<Text style={styles.account}>
						{t.settings.yourSeatsSummary(
							formatTemp(settings.maxTempC, tempUnit, 0),
							formatTemp(settings.minTempC, tempUnit, 0),
							formatDistance(settings.maxDistanceMeters, distanceUnit, 0),
						)}
					</Text>
					<Hint>
						{t.settings.yourSeatsHint(
							mine.length ? seatsPhrase(mine.map((s) => s.childName)) : "",
						)}
					</Hint>
					{seats.some((s) => s.sharedBy) ? (
						<Hint>{t.settings.sharedFollowOwner}</Hint>
					) : null}
					<Button
						compact
						variant="secondary"
						icon="slider.horizontal.3"
						title={t.settings.seatSettings}
						onPress={() => router.push("/seat-settings")}
					/>
				</Section>

				<SectionTitle>{t.team.title}</SectionTitle>
				<Section>
					<Text style={styles.account}>{teamSummary}</Text>
					<Button
						compact
						variant="secondary"
						icon="person.2.fill"
						title={t.team.see}
						onPress={() => router.push("/team")}
					/>
				</Section>

				{/* Everything after this is the phone's own. */}
				<Section style={styles.divider}>
					<SectionTitle>{t.settings.personalSettings}</SectionTitle>
					<Hint>{t.settings.thisPhone}</Hint>
				</Section>

				<SectionTitle>{t.settings.comfort}</SectionTitle>
				<Section>
					<OptionsField label={t.settings.language}>
						{LANGUAGE_CHOICES.map((choice) => (
							<Button
								key={choice}
								compact
								title={
									choice === "system"
										? t.settings.languageSystem
										: LANGUAGE_NAMES[choice]
								}
								variant="secondary"
								selected={settings.language === choice}
								onPress={() => apply({ language: choice })}
							/>
						))}
					</OptionsField>
					<OptionsField label={t.common.textSize}>
						{TEXT_SIZES.map((size) => (
							<Button
								key={size}
								compact
								title={t.settings.textSizes[size]}
								variant="secondary"
								selected={settings.textSize === size}
								onPress={() => apply({ textSize: size })}
							/>
						))}
					</OptionsField>
					<SwitchField
						label={t.common.readAloud}
						value={settings.readAloud}
						onValueChange={setReadAloud}
						hint={t.settings.readAloudHint}
					/>
				</Section>

				<SectionTitle>{t.settings.units}</SectionTitle>
				<Section>
					<OptionsField label={t.settings.temperature}>
						{(["F", "C"] as const).map((u) => (
							<Button
								key={u}
								compact
								title={u === "F" ? t.settings.fahrenheit : t.settings.celsius}
								variant="secondary"
								selected={tempUnit === u}
								onPress={() => apply({ temperatureUnit: u })}
							/>
						))}
					</OptionsField>
					<OptionsField label={t.settings.distance}>
						{(["ft", "m"] as const).map((u) => (
							<Button
								key={u}
								compact
								title={u === "ft" ? t.settings.feet : t.settings.metres}
								variant="secondary"
								selected={distanceUnit === u}
								onPress={() => apply({ distanceUnit: u })}
							/>
						))}
					</OptionsField>
				</Section>

				<SectionTitle>{t.settings.inAndOut}</SectionTitle>
				<Section>
					<SwitchField
						label={t.settings.notifyInAndOut}
						value={settings.notifyOccupancyChanges}
						onValueChange={(notifyOccupancyChanges) =>
							apply({ notifyOccupancyChanges })
						}
						hint={t.settings.notifyInAndOutHint}
					/>
				</Section>

				<SectionTitle>{t.settings.seatScreen}</SectionTitle>
				<Section>
					<SwitchField
						label={t.settings.showPressure}
						value={settings.showPressure}
						onValueChange={(showPressure) => apply({ showPressure })}
						hint={t.settings.showPressureHint(settings.occupancyPressureThreshold)}
					/>
					<SwitchField
						label={t.settings.showSignal}
						value={settings.showSignalStrength}
						onValueChange={(showSignalStrength) => apply({ showSignalStrength })}
						hint={t.settings.showSignalHint}
					/>
				</Section>

				<SectionTitle>{t.settings.findTheSeat}</SectionTitle>
				<Section>
					{LOCATION_APPS.map((app) => (
						<SwitchField
							key={app.setting}
							label={t.settings.shortcut(locationAppText(app).name)}
							value={settings[app.setting]}
							onValueChange={(on) => apply({ [app.setting]: on })}
							hint={locationAppText(app).description}
						/>
					))}
					<SwitchField
						label={t.settings.rememberLocation}
						value={settings.rememberSeatLocation}
						onValueChange={(on) => void toggleSeatLocation(on)}
						hint={seatLocationHint}
						error={locationAccess === "denied" ? t.settings.locationDenied : undefined}
					/>
					{locationAccess === "denied" && (
						<Button
							compact
							variant="secondary"
							icon="gear"
							title={t.common.openSettings}
							onPress={() => void Linking.openSettings()}
						/>
					)}
				</Section>

				<View style={styles.actions}>
					<Hint>{t.common.changesSave}</Hint>
					<Button
						variant="secondary"
						icon="hammer.fill"
						title={t.settings.developerOptions}
						onPress={() => router.push("/developer")}
					/>
				</View>
			</ScreenScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1 },
	content: { padding: SPACE, gap: 10, paddingBottom: 48 },
	account: { fontSize: 17, lineHeight: 24, color: colors.text },
	actions: { gap: 10, marginTop: 24 },
	divider: { marginTop: 22 },
});
