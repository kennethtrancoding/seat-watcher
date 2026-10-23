import { Animated, Pressable, StyleSheet, View } from "react-native";

import { seatStatus } from "../alerts/messages";
import { useStrings } from "../i18n/useStrings";
import type { SeatMonitorSnapshot } from "../monitor/MonitorService";
import { seatTitle, type Seat } from "../seats/seats";
import { formatDistance, formatTemp, type Settings } from "../settings/settings";
import { ChildAvatar } from "./ChildPhoto";
import { usePressSpring } from "./motion";
import { Button, Icon, Mark, Text, colors, textStyles } from "./ui";

/**
 * A seat on the home screen, as a row under a hairline: the child, how the
 * seat is doing, the latest readings, and a quick Connect. Tapping it opens
 * the seat's own screen. During an alert its status is red; the red band above
 * it says what's wrong.
 */
export function SeatCard({
	seat,
	snapshot,
	settings,
	onPress,
	onConnect,
}: {
	seat: Seat;
	snapshot: SeatMonitorSnapshot;
	settings: Settings;
	onPress: () => void;
	/** Shown while idle. Omit when connecting isn't possible (no Bluetooth). */
	onConnect?: () => void;
}) {
	const { state } = snapshot;
	const t = useStrings();
	const status = seatStatus(state, seat.childName);
	const spring = usePressSpring({ depth: 0.98 });
	const attention = status.tone === "attention";
	const live = state.link === "connected" || state.link === "reconnecting";
	const summary = capitalize(status.text.replace(`${seatTitle(seat.childName)}: `, ""));
	const readings = [
		live && state.temperatureC !== null ? formatTemp(state.temperatureC, settings.temperatureUnit) : null,
		live && state.proximity ? `≈ ${formatDistance(state.proximity.distanceMeters, settings.distanceUnit)}` : null,
		live && state.pressure !== null ? (state.occupied ? t.common.inTheSeat : t.seatCard.empty) : null,
	].filter(Boolean);

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`${status.text}. ${readings.join(", ")}`}
			accessibilityHint={t.seatCard.opens}
			onPress={onPress}
			{...spring.handlers}>
			<Animated.View style={[styles.card, spring.style]}>
				<View style={styles.row}>
					<ChildAvatar
						uri={seat.childPhotoUri}
						name={seat.childName}
						size={56}
						ring={attention ? colors.alarm : undefined}
					/>
					<View style={styles.text}>
						<Text style={styles.title}>{seatTitle(seat.childName)}</Text>
						{status.tone === "ok" ? (
							<Mark>{summary}</Mark>
						) : (
							<View style={styles.statusRow}>
								{attention ? <Icon name="exclamationmark.triangle.fill" size={15} color={colors.alarm} /> : null}
								<Text style={[styles.status, attention && styles.statusAlarm]}>{summary}</Text>
							</View>
						)}
						{readings.length ? <Text style={styles.readings}>{readings.join(" · ")}</Text> : null}
					</View>
					<Icon name="chevron.right" size={15} color={colors.secondary} />
				</View>
				{onConnect && state.link === "idle" ? (
					<Button compact icon="dot.radiowaves.left.and.right" title={seat.deviceId || settings.useSimulator ? t.seatCard.connect : t.seat.pair} onPress={onConnect} />
				) : null}
			</Animated.View>
		</Pressable>
	);
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const styles = StyleSheet.create({
	card: { gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.hairline },
	row: { flexDirection: "row", alignItems: "center", gap: 14 },
	text: { flex: 1, gap: 3 },
	title: { ...textStyles.headline, color: colors.text },
	statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
	status: { ...textStyles.subhead, color: colors.secondary },
	statusAlarm: { fontWeight: "600", color: colors.alarm },
	readings: { ...textStyles.subhead, color: colors.secondary, fontVariant: ["tabular-nums"] },
});
