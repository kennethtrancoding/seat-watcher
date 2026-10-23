import { ScreenScrollView } from "../../components/ScreenScrollView";
import { Stack, router, useLocalSearchParams } from "expo-router";
import type { SFSymbol } from "expo-symbols";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { seatStatus } from "../../alerts/messages";
import type { LinkStatus } from "../../ble/transport";
import { useReadAloud } from "../../comfort/useReadAloud";
import { AlarmBand } from "../../components/AlarmBand";
import { ChildPhotoPicker } from "../../components/ChildPhoto";
import { Hint } from "../../components/fields";
import { LocateCard } from "../../components/LocateCard";
import { SeatStatusCard } from "../../components/SeatStatusCard";
import { SimulatorPanel } from "../../components/SimulatorPanel";
import {
	Button,
	Icon,
	Mark,
	Notice,
	SPACE,
	Section,
	SectionTitle,
	Text,
	TextField,
	colors,
	textStyles,
} from "../../components/ui";
import { useStrings } from "../../i18n/useStrings";
import { useMonitor, useSeat } from "../../monitor/MonitorProvider";
import { deleteChildPhoto } from "../../onboarding/childPhoto";
import { MAX_CHILD_NAME_LENGTH, seatTitle, settingsForSeat, validateChildName } from "../../seats/seats";
import { formatDistance, formatTemp, toDisplayTemp } from "../../settings/settings";

const LINK_LOOKS: Record<LinkStatus, { icon: SFSymbol; color: string }> = {
	idle: { icon: "circle", color: colors.secondary },
	scanning: { icon: "dot.radiowaves.left.and.right", color: colors.text },
	connecting: { icon: "dot.radiowaves.left.and.right", color: colors.text },
	waiting: { icon: "dot.radiowaves.left.and.right", color: colors.text },
	connected: { icon: "checkmark.circle.fill", color: colors.text },
	reconnecting: { icon: "exclamationmark.triangle.fill", color: colors.alarm },
};

type Status = { text: string; alarm?: boolean } | null;

/**
 * One seat: its status, connection, readings, where it was last seen, and its
 * details. A seat shared with you can be paired, connected and given a photo
 * here, but its name and whether it's watched at all are its owner's call.
 */
export default function SeatScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const {
		settings,
		connect,
		disconnect,
		saveSettings,
		unavailableReason,
		updateSeat,
		removeSeat,
		forgetSeatHardware,
	} = useMonitor();
	const { seat, state, simulator, lastSeen } = useSeat(id);
	// When it alerts: your settings for your own seats, or its owner's for a shared one.
	const rules = seat ? settingsForSeat(settings, seat) : settings;
	const t = useStrings();
	const childName = seat?.childName ?? "";
	const [name, setName] = useState(childName);
	const nameError = validateChildName(name);
	const unit = settings.temperatureUnit;
	const distanceUnit = settings.distanceUnit;
	const limit = formatDistance(rules.maxDistanceMeters, distanceUnit, 0);
	const alerting = state.activeAlerts.length > 0;
	const locateCard = (
		<LocateCard lastSeen={lastSeen} settings={settings} activeAlerts={state.activeAlerts} />
	);
	const link = { text: t.seat.links[state.link], ...LINK_LOOKS[state.link] };
	const hasReadings = state.link === "connected" || state.link === "reconnecting";
	const stale = state.link === "reconnecting";
	useReadAloud(seatStatus(state, childName).text);
	// Never paired: the first connect goes through pairing, which checks it's the right seat.
	const needsPairing = !settings.useSimulator && !seat?.deviceId;

	if (!seat) return null; // just removed; the screen is closing
	const sharedBy = seat.sharedBy;

	const setPhoto = (uri: string) => {
		if (uri !== seat.childPhotoUri) deleteChildPhoto(seat.childPhotoUri);
		void updateSeat(seat.id, { childPhotoUri: uri });
	};

	const pairAgain = async () => {
		await forgetSeatHardware(seat.id);
		router.push({ pathname: "/seat/pair", params: { id: seat.id } });
	};

	const remove = () =>
		Alert.alert(t.seat.removeTitle(childName), t.seat.removeBody, [
			{ text: t.common.cancel, style: "cancel" },
			{
				text: t.common.remove,
				style: "destructive",
				onPress: () => {
					router.back();
					void removeSeat(seat.id);
				},
			},
		]);

	const temp = state.temperatureC;
	const tempStatus: Status =
		temp === null
			? null
			: temp > rules.maxTempC
				? { text: t.seat.tooHot, alarm: true }
				: temp < rules.minTempC
					? { text: t.seat.tooCold, alarm: true }
					: { text: t.seat.justRight };

	const proximity = state.proximity;
	const proximityStatus: Status = !proximity
		? null
		: !proximity.isBeyond
			? { text: t.seat.closeBy }
			: state.othersNearby > 0
				? { text: t.seat.othersClose(state.othersNearby) }
				: { text: t.seat.tooFar, alarm: true };

	return (
		<View style={styles.screen}>
			<Stack.Screen options={{ title: seatTitle(childName) }} />
			<ScreenScrollView
				contentContainerStyle={styles.content}
				automaticallyAdjustKeyboardInsets
				keyboardShouldPersistTaps="handled">
				<SeatStatusCard seatId={seat.id} />

				{alerting && <AlarmBand childName={childName} alerts={state.activeAlerts} />}
				{/* During an alert the locate shortcuts move up, right under it. */}
				{alerting && locateCard}

				{unavailableReason && (
					<Notice
						tone="warning"
						actions={
							<Button
								title={t.common.useSimulatedCarSeat}
								variant="secondary"
								onPress={() =>
									void saveSettings({ ...settings, useSimulator: true })
								}
							/>
						}>
						{unavailableReason}
					</Notice>
				)}

				<Section>
					<View style={styles.linkRow}>
						<Icon name={link.icon} size={20} color={link.color} />
						<Text style={[styles.linkText, { color: link.color }]}>{link.text}</Text>
					</View>
					{state.deviceName && state.link !== "idle" && (
						<Text style={styles.secondary}>
							{state.source === "simulator"
								? t.seat.simulated(state.deviceName)
								: state.deviceName}
						</Text>
					)}
					{state.error && <Text style={styles.secondary}>{state.error}</Text>}
					{!unavailableReason &&
						(state.link !== "idle" ? (
							<Button
								title={
									state.link === "connected" ? t.seat.disconnect : t.common.cancel
								}
								variant="secondary"
								onPress={() => disconnect(seat.id)}
							/>
						) : needsPairing ? (
							<Button
								icon="dot.radiowaves.left.and.right"
								title={t.seat.pair}
								onPress={() =>
									router.push({ pathname: "/seat/pair", params: { id: seat.id } })
								}
							/>
						) : (
							<Button
								icon="dot.radiowaves.left.and.right"
								title={t.seat.connect}
								onPress={() => connect(seat.id)}
							/>
						))}
				</Section>

				<View style={[styles.readings, stale && styles.stale]}>
					<Reading
						icon="figure.and.child.holdinghands"
						label={t.common.inTheSeat}
						value={
							hasReadings && state.pressure !== null
								? state.occupied
									? childName || t.common.someone
									: t.seat.noOne
								: "—"
						}
						detail={
							!settings.showPressure
								? undefined
								: hasReadings && state.pressure !== null
									? t.seat.pressure(
											state.pressure,
											rules.occupancyPressureThreshold,
										)
									: t.seat.occupiedAt(rules.occupancyPressureThreshold)
						}
						status={hasReadings && state.occupied ? { text: t.common.watching } : null}
					/>
					<Reading
						icon="thermometer.medium"
						label={t.seat.temperature}
						value={hasReadings && temp !== null ? formatTemp(temp, unit) : "—"}
						detail={t.seat.safeRange(
							toDisplayTemp(rules.minTempC, unit).toFixed(0),
							formatTemp(rules.maxTempC, unit, 0),
						)}
						status={hasReadings ? tempStatus : null}
					/>
					<Reading
						icon="figure.walk"
						label={t.seat.distance}
						value={
							hasReadings && proximity
								? `≈ ${formatDistance(proximity.distanceMeters, distanceUnit)}`
								: "—"
						}
						detail={
							settings.showSignalStrength && hasReadings && state.rssi !== null
								? t.seat.signal(Math.round(proximity?.rssi ?? state.rssi), limit)
								: t.seat.alertPast(limit)
						}
						status={hasReadings ? proximityStatus : null}
					/>
					{stale && <Text style={styles.secondary}>{t.seat.stale}</Text>}
				</View>

				{!alerting && locateCard}

				{simulator && (
					<SimulatorPanel simulator={simulator} unit={unit} distanceUnit={distanceUnit} />
				)}

				<SectionTitle>{t.seat.about}</SectionTitle>
				<Section>
					{sharedBy ? (
						<>
							<Text style={styles.label}>{t.common.childName}</Text>
							<Text style={styles.value}>{childName || t.common.someone}</Text>
							<Hint>{t.seat.sharedNote(sharedBy.ownerName)}</Hint>
						</>
					) : (
						<TextField
							label={t.common.childName}
							value={name}
							onChangeText={setName}
							autoCapitalize="words"
							autoCorrect={false}
							maxLength={MAX_CHILD_NAME_LENGTH}
							error={nameError}
							hint={t.seat.nameHint}
						/>
					)}
					{!sharedBy && name.trim() !== childName && !nameError ? (
						<Button
							compact
							icon="checkmark"
							title={t.common.saveName}
							onPress={() => void updateSeat(seat.id, { childName: name.trim() })}
						/>
					) : null}
					<ChildPhotoPicker
						uri={seat.childPhotoUri}
						name={sharedBy ? childName : name.trim()}
						onChange={setPhoto}
					/>
				</Section>
				<Section>
					<Text style={styles.label}>{t.seat.hardware}</Text>
					<Hint>
						{settings.useSimulator
							? t.seat.usingSimulator
							: seat.deviceId
								? t.seat.pairedWith(seat.deviceName)
								: t.seat.notPaired}
					</Hint>
				</Section>
				{/* Someone else's seat is theirs to remove; leaving their team takes it off this phone. */}
				{sharedBy ? (
					<Button
						variant="secondary"
						icon="person.2.fill"
						title={t.seat.seeTeam(sharedBy.ownerName)}
						onPress={() => router.push("/team")}
					/>
				) : (
					<Button variant="danger" icon="trash" title={t.seat.removeSeat} onPress={remove} />
				)}

				<Text style={styles.footnote}>{t.common.prototypeNote}</Text>
			</ScreenScrollView>
		</View>
	);
}

function Reading({
	icon,
	label,
	value,
	detail,
	status,
}: {
	icon: SFSymbol;
	label: string;
	value: string;
	detail?: string;
	status: Status;
}) {
	const alarm = !!status?.alarm;
	return (
		<Section style={styles.reading}>
			<View style={styles.readingHeader}>
				<Icon name={icon} size={17} color={alarm ? colors.alarm : colors.secondary} />
				<Text style={styles.readingLabel}>{label}</Text>
				{status && <Mark alarm={alarm}>{status.text}</Mark>}
			</View>
			<Text style={[styles.readingValue, alarm && styles.alarm]}>{value}</Text>
			{detail && <Text style={styles.secondary}>{detail}</Text>}
		</Section>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1 },
	content: { padding: SPACE, gap: 14, paddingBottom: 40 },
	linkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
	linkText: { fontSize: 20, lineHeight: 25, fontWeight: "600" },
	secondary: { ...textStyles.subhead, color: colors.secondary },
	// One row per reading, each under a hairline, and one more closing the list.
	readings: { borderBottomWidth: 1, borderBottomColor: colors.hairline, paddingBottom: 2 },
	stale: { opacity: 0.55 },
	reading: { gap: 2, paddingBottom: 14 },
	readingHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
	readingLabel: { ...textStyles.subhead, flex: 1, fontWeight: "600", color: colors.secondary },
	readingValue: { ...textStyles.reading, color: colors.text },
	alarm: { color: colors.alarm },
	label: { ...textStyles.headline, color: colors.text },
	value: { ...textStyles.body, color: colors.text },
	footnote: { ...textStyles.subhead, color: colors.secondary, marginTop: 8 },
});
