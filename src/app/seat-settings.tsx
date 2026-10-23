import { ScreenScrollView } from "../components/ScreenScrollView";
import { StyleSheet, View } from "react-native";

import { Hint, NumberField } from "../components/fields";
import { Notice, SPACE, Section, SectionTitle, Text, colors } from "../components/ui";
import { useStrings } from "../i18n/useStrings";
import { useMonitor } from "../monitor/MonitorProvider";
import { ownSeats, seatsPhrase } from "../seats/seats";
import {
	fromDisplayDistance,
	fromDisplayTemp,
	parseNumberInput,
	toDisplayDistance,
	toDisplayTemp,
	type Settings,
} from "../settings/settings";
import { useAutosavedDraft } from "../settings/useAutosavedDraft";

/**
 * Settings › Settings for your seats: when your own seats alert, and how long
 * before your helpers hear (SEAT_SETTING_KEYS in settings.ts). They go with
 * your seats, so your helpers' phones use them too; seats shared with you
 * follow their owner's. Typed values save by themselves once they're checked
 * (see useAutosavedDraft). The units come from Settings.
 */

/** What's typed on this screen. Temperatures and distances are in the chosen units. */
interface Draft {
	maxTemp: string;
	minTemp: string;
	maxDistance: string;
	backupAfterMinutes: string;
}

const round1 = (n: number) => String(Math.round(n * 10) / 10);

function toDraft(s: Settings): Draft {
	return {
		maxTemp: round1(toDisplayTemp(s.maxTempC, s.temperatureUnit)),
		minTemp: round1(toDisplayTemp(s.minTempC, s.temperatureUnit)),
		maxDistance: round1(toDisplayDistance(s.maxDistanceMeters, s.distanceUnit)),
		backupAfterMinutes: String(s.backupAfterMinutes),
	};
}

function fromDraft(d: Draft, s: Settings): Settings {
	return {
		...s,
		maxTempC: fromDisplayTemp(parseNumberInput(d.maxTemp), s.temperatureUnit),
		minTempC: fromDisplayTemp(parseNumberInput(d.minTemp), s.temperatureUnit),
		maxDistanceMeters: fromDisplayDistance(parseNumberInput(d.maxDistance), s.distanceUnit),
		backupAfterMinutes: parseNumberInput(d.backupAfterMinutes),
	};
}

export default function SeatSettingsScreen() {
	const { settings, seats } = useMonitor();
	const t = useStrings();
	const { draft, setDraft, errors } = useAutosavedDraft(toDraft, fromDraft);
	const type = (key: keyof Draft) => (text: string) => setDraft((d) => ({ ...d, [key]: text }));

	const mine = ownSeats(seats);
	const tempUnit = settings.temperatureUnit;
	const distanceUnit = settings.distanceUnit;

	return (
		<View style={styles.screen}>
			<ScreenScrollView
				contentContainerStyle={styles.content}
				automaticallyAdjustKeyboardInsets
				keyboardDismissMode="interactive"
				keyboardShouldPersistTaps="handled">
				<Text style={styles.intro}>
					{t.seatSettings.intro(mine.length ? seatsPhrase(mine.map((s) => s.childName)) : "")}
				</Text>
				{seats.some((s) => s.sharedBy) ? <Notice tone="info">{t.seatSettings.sharedNote}</Notice> : null}

				<SectionTitle>{t.settings.temperature}</SectionTitle>
				<Section>
					<NumberField
						label={t.settings.tooHotAbove}
						suffix={`°${tempUnit}`}
						value={draft.maxTemp}
						onChangeText={type("maxTemp")}
						error={errors.maxTempC}
						allowNegative
					/>
					<NumberField
						label={t.settings.tooColdBelow}
						suffix={`°${tempUnit}`}
						value={draft.minTemp}
						onChangeText={type("minTemp")}
						error={errors.minTempC}
						allowNegative
					/>
				</Section>

				<SectionTitle>{t.settings.distance}</SectionTitle>
				<Section>
					<NumberField
						label={t.settings.alertPast}
						suffix={distanceUnit}
						value={draft.maxDistance}
						onChangeText={type("maxDistance")}
						error={errors.maxDistanceMeters}
						hint={t.settings.distanceHint(distanceUnit)}
					/>
				</Section>

				<SectionTitle>{t.seatSettings.helpers}</SectionTitle>
				<Section>
					<NumberField
						label={t.settings.reachThemAfter}
						suffix={t.common.minutes}
						value={draft.backupAfterMinutes}
						onChangeText={type("backupAfterMinutes")}
						error={errors.backupAfterMinutes}
						hint={t.settings.reachThemHint}
					/>
				</Section>

				<View style={styles.actions}>
					<Hint>{t.common.changesSave}</Hint>
				</View>
			</ScreenScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1 },
	content: { padding: SPACE, gap: 10, paddingBottom: 48 },
	intro: { fontSize: 17, lineHeight: 24, color: colors.text },
	actions: { gap: 10, marginTop: 24 },
});
