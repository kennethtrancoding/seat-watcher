import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import type { AlertKind } from "../alerts/AlertEngine";
import { alertLabel } from "../alerts/messages";
import { useStrings } from "../i18n/useStrings";
import { Icon, Text, colors, textStyles } from "./ui";

/**
 * "Please check on Emma" and what's wrong, on the red alarm band: the one
 * filled block in the app (docs/design.md). `action` goes underneath, on white
 * glass.
 */
export function AlarmBand({
	childName,
	alerts,
	action,
}: {
	childName: string;
	alerts: AlertKind[];
	action?: ReactNode;
}) {
	const t = useStrings();
	return (
		<View style={styles.band}>
			<View style={styles.header}>
				<Icon name="exclamationmark.triangle.fill" size={24} color={colors.onAlarm} />
				<Text style={styles.title}>{t.common.checkOn(childName)}</Text>
			</View>
			{alerts.map((kind) => (
				<Text key={kind} style={styles.item}>
					{alertLabel(kind)}
				</Text>
			))}
			{action}
		</View>
	);
}

const styles = StyleSheet.create({
	band: { gap: 8, padding: 18, backgroundColor: colors.alarm },
	header: { flexDirection: "row", alignItems: "center", gap: 10 },
	title: { ...textStyles.title, flex: 1, color: colors.onAlarm },
	item: { ...textStyles.body, color: colors.onAlarm },
});
