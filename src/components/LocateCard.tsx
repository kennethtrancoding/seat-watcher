import { StyleSheet, View } from "react-native";

import type { AlertKind } from "../alerts/AlertEngine";
import { alertLabel } from "../alerts/messages";
import { useStrings } from "../i18n/useStrings";
import { enabledLocationApps, formatSeenAt, locationAppText } from "../locate/links";
import { openInMaps, openLocationApp, shareSeatLocation } from "../locate/open";
import type { SeatLocation } from "../locate/SeatLocator";
import { formatRoughDistance, type DistanceUnit, type Settings } from "../settings/settings";
import { Button, CardTitle, Section, Text, colors } from "./ui";

/**
 * "Find the car seat": where the seat was last seen, plus shortcuts to Maps,
 * the share sheet, Find My and Life360. Renders nothing until one of those is
 * turned on in Settings.
 */
export function LocateCard({
	lastSeen,
	settings,
	activeAlerts,
}: {
	lastSeen: SeatLocation | null;
	settings: Settings;
	activeAlerts: AlertKind[];
}) {
	const t = useStrings().locate;
	const apps = enabledLocationApps(settings);
	if (!settings.rememberSeatLocation && apps.length === 0) return null;

	return (
		<Section>
			<CardTitle icon="mappin.and.ellipse">{t.title}</CardTitle>
			{settings.rememberSeatLocation && (
				<Text style={styles.detail}>
					{lastSeen
						? `${t.lastSeen(formatSeenAt(lastSeen.timestamp))}${formatAccuracy(lastSeen.accuracyMeters, settings.distanceUnit)}`
						: t.noSpotYet}
				</Text>
			)}
			<View style={styles.buttons}>
				{lastSeen && (
					<>
						<Button
							compact
							variant="secondary"
							icon="map.fill"
							title={t.openInMaps}
							onPress={() => void openInMaps(lastSeen)}
						/>
						<Button
							compact
							variant="secondary"
							icon="square.and.arrow.up"
							title={t.shareLocation}
							onPress={() =>
								void shareSeatLocation(
									lastSeen,
									activeAlerts.map(alertLabel),
								)
							}
						/>
					</>
				)}
				{apps.map((app) => (
					<Button
						key={app.name}
						compact
						variant="secondary"
						title={t.open(locationAppText(app).name)}
						onPress={() => void openLocationApp(app)}
					/>
				))}
			</View>
		</Section>
	);
}

function formatAccuracy(meters: number | null, unit: DistanceUnit): string {
	return meters === null ? "" : ` · ±${formatRoughDistance(meters, unit)}`;
}

const styles = StyleSheet.create({
	detail: { fontSize: 15, lineHeight: 21, color: colors.secondary },
	buttons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
