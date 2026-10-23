import { StyleSheet, View } from "react-native";

import { seatStatus, type StatusTone } from "../alerts/messages";
import { useSeat } from "../monitor/MonitorProvider";
import { ChildAvatar } from "./ChildPhoto";
import { Text, colors, textStyles } from "./ui";

/**
 * One seat's status: "Emma's seat: looking good", in ink on the paper. It turns
 * red when the seat needs you (its icon pulses); during an alert the red band
 * under it says what's wrong.
 */
export function SeatStatusCard({ seatId }: { seatId: string }) {
	const { seat, state } = useSeat(seatId);
	const childName = seat?.childName ?? "";
	const status = seatStatus(state, childName);
	const alarm = status.tone === "attention";
	const ink = alarm ? colors.alarm : colors.text;
	return (
		<View style={styles.card}>
			<ChildAvatar
				uri={seat?.childPhotoUri ?? ""}
				name={childName}
				size={64}
				ring={alarm ? colors.alarm : undefined}
			/>
			<View
				style={styles.text}
				accessible
				accessibilityRole="summary"
				accessibilityLabel={status.text}
				accessibilityLiveRegion="polite">
				<Text style={[styles.status, { color: ink }]}>{status.text}</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 8 },
	text: { flex: 1, gap: 6, alignItems: "flex-start" },
	status: textStyles.title,
});
