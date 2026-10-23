import { ScreenScrollView } from "../components/ScreenScrollView";
import { router } from "expo-router";
import { Linking, StyleSheet, View } from "react-native";

import { greeting } from "../account/account";
import { seatStatus } from "../alerts/messages";
import { useReadAloud } from "../comfort/useReadAloud";
import { AlarmBand } from "../components/AlarmBand";
import { SeatCard } from "../components/SeatCard";
import { Button, Notice, SPACE, SectionTitle, Text, colors, textStyles } from "../components/ui";
import { useStrings } from "../i18n/useStrings";
import { useMonitor } from "../monitor/MonitorProvider";
import { IDLE_SEAT, type SeatMonitorSnapshot } from "../monitor/MonitorService";
import { useOnboarding } from "../onboarding/OnboardingProvider";
import { MAX_SEATS, ownSeats, type Seat } from "../seats/seats";

type Watched = { seat: Seat; snapshot: SeatMonitorSnapshot };

/**
 * Home: a greeting, how every seat is doing, and one card per seat. All the
 * seats are watched at once; tapping one opens its own screen. Once some are
 * shared with you, yours come first, then each team's under its owner's name.
 */
export default function HomeScreen() {
	const {
		seats,
		seatStates,
		settings,
		saveSettings,
		unavailableReason,
		notificationsAllowed,
		criticalAlerts,
		requestNotifications,
		connect,
		connectAll,
	} = useMonitor();
	const { account } = useOnboarding();
	const t = useStrings();
	const watched = seats.map((seat) => ({ seat, snapshot: seatStates[seat.id] ?? IDLE_SEAT }));
	const alerting = watched.filter((w) => w.snapshot.state.activeAlerts.length > 0);
	const connected = watched.filter((w) => w.snapshot.state.link === "connected");
	const idle = watched.filter((w) => w.snapshot.state.link === "idle");
	const waiting = watched.filter((w) => w.snapshot.state.link === "waiting");
	const own = watched.filter((w) => !w.seat.sharedBy);
	// Seats shared with you, a group for each team that shares them, in the order they came.
	const shared: { teamId: string; ownerName: string; watched: Watched[] }[] = [];
	for (const w of watched) {
		if (!w.seat.sharedBy) continue;
		const { teamId, ownerName } = w.seat.sharedBy;
		const group = shared.find((g) => g.teamId === teamId);
		if (group) group.watched.push(w);
		else shared.push({ teamId, ownerName, watched: [w] });
	}

	const summary = !seats.length
		? t.home.noSeats
		: alerting.length
			? t.home.checkOn(alerting.map((w) => w.seat.childName))
			: connected.length === seats.length
				? seats.length === 1
					? seatStatus(watched[0].snapshot.state, watched[0].seat.childName).text
					: t.home.allGood
				: connected.length === 0
					? waiting.length
						? t.home.waitingForYou(seats.length)
						: t.home.connectToStart(seats.length)
					: t.home.someConnected(connected.length, seats.length);
	useReadAloud(summary);

	const open = (seatId: string) =>
		router.push({ pathname: "/seat/[id]", params: { id: seatId } });
	// A seat that's never been paired goes through pairing, which checks it's
	// the right one.
	const connectOrPair = (seatId: string, paired: boolean) =>
		paired || settings.useSimulator
			? connect(seatId)
			: router.push({ pathname: "/seat/pair", params: { id: seatId } });

	const seatCards = (list: Watched[]) => (
		<View style={styles.seats}>
			{list.map(({ seat, snapshot }) => (
				<SeatCard
					key={seat.id}
					seat={seat}
					snapshot={snapshot}
					settings={settings}
					onPress={() => open(seat.id)}
					onConnect={
						unavailableReason ? undefined : () => connectOrPair(seat.id, !!seat.deviceId)
					}
				/>
			))}
		</View>
	);

	return (
		<View style={styles.screen}>
			<ScreenScrollView largeTitle contentContainerStyle={styles.content}>
				<View style={styles.hello} accessible accessibilityRole="summary">
					<Text style={styles.greeting}>
						{greeting(account?.name ?? "", new Date().getHours())}
					</Text>
					<Text style={[styles.summary, alerting.length > 0 && styles.summaryAlarm]}>
						{summary}
					</Text>
				</View>

				{alerting.map(({ seat, snapshot }) => (
					<AlarmBand
						key={seat.id}
						childName={seat.childName}
						alerts={snapshot.state.activeAlerts}
						action={
							<Button
								compact
								onColor
								icon="arrow.right"
								title={t.home.openSeat(seat.childName)}
								onPress={() => open(seat.id)}
							/>
						}
					/>
				))}

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

				{notificationsAllowed === false && (
					<Notice
						tone="warning"
						actions={
							<Button
								title={t.common.openSettings}
								variant="secondary"
								onPress={() => void Linking.openSettings()}
							/>
						}>
						{t.home.notificationsOff}
					</Notice>
				)}

				{/* Also how someone set up before critical alerts existed gets asked for them. */}
				{notificationsAllowed && criticalAlerts === "notAsked" && (
					<Notice
						tone="info"
						actions={
							<Button
								title={t.home.allowCriticalAlerts}
								variant="secondary"
								onPress={() => void requestNotifications()}
							/>
						}>
						{t.home.criticalAlertsAsk}
					</Notice>
				)}

				{notificationsAllowed && criticalAlerts === "off" && (
					<Notice
						tone="info"
						actions={
							<Button
								title={t.common.openSettings}
								variant="secondary"
								onPress={() => void Linking.openSettings()}
							/>
						}>
						{t.common.criticalAlertsOff}
					</Notice>
				)}

				{shared.length === 0 ? (
					watched.length > 0 && seatCards(watched)
				) : (
					<>
						{own.length > 0 && (
							<View style={styles.group}>
								<SectionTitle>{t.home.yourSeats}</SectionTitle>
								{seatCards(own)}
							</View>
						)}
						{shared.map((group) => (
							<View key={group.teamId} style={styles.group}>
								<SectionTitle>{t.home.sharedBy(group.ownerName)}</SectionTitle>
								{seatCards(group.watched)}
							</View>
						))}
					</>
				)}

				<View style={styles.actions}>
					{seats.length > 1 && idle.length > 1 && !unavailableReason && (
						<Button
							icon="dot.radiowaves.left.and.right"
							title={t.home.connectAll}
							onPress={connectAll}
						/>
					)}
					{/* Seats shared with you don't count: the limit is on your own. */}
					{ownSeats(seats).length < MAX_SEATS && (
						<Button
							variant={seats.length ? "secondary" : "primary"}
							icon="plus"
							title={own.length ? t.home.addAnother : t.home.addSeat}
							onPress={() => router.push("/seat/new")}
						/>
					)}
				</View>

				<Text style={styles.footnote}>{t.common.prototypeNote}</Text>
			</ScreenScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1 },
	content: { padding: SPACE, gap: 14, paddingBottom: 40 },
	hello: { gap: 4, marginBottom: 4 },
	greeting: { ...textStyles.title, color: colors.text },
	summary: { ...textStyles.body, color: colors.secondary },
	summaryAlarm: { color: colors.alarm, fontWeight: "600" },
	// One row per seat, each under a hairline, and one more closing the list.
	seats: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
	group: { gap: 4 },
	actions: { gap: 10, marginTop: 4 },
	footnote: { ...textStyles.subhead, color: colors.secondary, marginTop: 8 },
});
