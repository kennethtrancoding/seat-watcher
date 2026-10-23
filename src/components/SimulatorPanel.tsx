import { useReducer } from "react";
import { StyleSheet, View } from "react-native";

import {
	SIMULATED_RANGE_METERS,
	type SimulatedCarSeatTransport,
	type SimulatorScene,
} from "../ble/SimulatedCarSeatTransport";
import { useStrings } from "../i18n/useStrings";
import {
	formatDistance,
	formatTemp,
	fromDisplayDistance,
	fromDisplayTemp,
	type DistanceUnit,
	type TemperatureUnit,
} from "../settings/settings";
import { Button, CardTitle, Section, Switch, Text, colors } from "./ui";

const TEMP_PRESETS = [
	{ label: "mild", f: 72 },
	{ label: "hotCar", f: 100 },
	{ label: "coldCar", f: 40 },
] as const;

const DISTANCE_PRESETS = [
	{ label: "inCar", meters: 1 },
	{ label: "walkingAway", meters: 8 },
	{ label: "outOfRange", meters: SIMULATED_RANGE_METERS + 5 },
] as const;

/** Controls for the simulated seat, so every alert can be triggered on demand. */
export function SimulatorPanel({
	simulator,
	unit,
	distanceUnit,
}: {
	simulator: SimulatedCarSeatTransport;
	unit: TemperatureUnit;
	distanceUnit: DistanceUnit;
}) {
	// The simulator owns the scene; re-render after each change to show it.
	const [, rerender] = useReducer((n: number) => n + 1, 0);
	const t = useStrings().simulator;
	const scene = simulator.getScene();

	const change = (changes: Partial<SimulatorScene>) => {
		simulator.update(changes);
		rerender();
	};
	// About a metre either way: 3 ft or 1 m.
	const step = distanceUnit === "ft" ? 3 : 1;
	const stepMeters = fromDisplayDistance(step, distanceUnit);
	const stepTemp = (displayDelta: number) =>
		change({
			temperatureC:
				scene.temperatureC + (unit === "F" ? (displayDelta * 5) / 9 : displayDelta),
		});

	return (
		<Section>
			<CardTitle icon="wand.and.stars">{t.title}</CardTitle>

			<Text style={styles.label}>{t.temperature(formatTemp(scene.temperatureC, unit))}</Text>
			<View style={styles.buttons}>
				<Button compact variant="secondary" title="−1°" onPress={() => stepTemp(-1)} />
				<Button compact variant="secondary" title="+1°" onPress={() => stepTemp(1)} />
				{TEMP_PRESETS.map((p) => (
					<Button
						key={p.label}
						compact
						variant="secondary"
						title={t[p.label]}
						onPress={() => change({ temperatureC: fromDisplayTemp(p.f, "F") })}
					/>
				))}
			</View>

			<Text style={styles.label}>{t.distance(formatDistance(scene.distanceMeters, distanceUnit))}</Text>
			<View style={styles.buttons}>
				<Button
					compact
					variant="secondary"
					title={`−${step} ${distanceUnit}`}
					onPress={() =>
						change({ distanceMeters: Math.max(0.5, scene.distanceMeters - stepMeters) })
					}
				/>
				<Button
					compact
					variant="secondary"
					title={`+${step} ${distanceUnit}`}
					onPress={() => change({ distanceMeters: scene.distanceMeters + stepMeters })}
				/>
				{DISTANCE_PRESETS.map((p) => (
					<Button
						key={p.label}
						compact
						variant="secondary"
						title={t[p.label]}
						onPress={() => change({ distanceMeters: p.meters })}
					/>
				))}
			</View>

			<View style={styles.switchRow}>
				<Text style={styles.label}>{t.occupied}</Text>
				<Switch value={scene.occupied} onValueChange={(occupied) => change({ occupied })} />
			</View>
			<View style={styles.switchRow}>
				<Text style={styles.label}>{t.cutPower}</Text>
				<Switch
					value={scene.linkBlocked}
					onValueChange={(linkBlocked) => change({ linkBlocked })}
				/>
			</View>
			<View style={styles.switchRow}>
				<Text style={styles.label}>{t.someoneElseNearby}</Text>
				<Switch
					value={scene.someoneElseNearby}
					onValueChange={(someoneElseNearby) => change({ someoneElseNearby })}
				/>
			</View>
		</Section>
	);
}

const styles = StyleSheet.create({
	label: { fontSize: 15, fontWeight: "600", color: colors.secondary, marginTop: 4 },
	buttons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
