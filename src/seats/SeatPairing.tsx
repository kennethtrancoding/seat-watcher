import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";

import { Button, Notice, Text, colors } from "../components/ui";
import { useStrings } from "../i18n/useStrings";
import { useMonitor, useSeat } from "../monitor/MonitorProvider";
import type { StepId } from "../onboarding/flow";
import { OnboardingScreen } from "../onboarding/OnboardingScreen";
import { SUPPORT_PHONE_NUMBER, callSupport } from "../onboarding/support";

/**
 * After connecting to a real seat: 'idle' while the blink is being asked for,
 * then 'blinking', or 'unsupported' if the seat's firmware predates Identify.
 */
type Blink = "idle" | "blinking" | "unsupported";

/**
 * Finding and connecting one seat, confirmed by its light blinking. Setup's
 * seat step and "Add a car seat" both use it. Connecting pairs the seat with
 * that hardware, so later it reconnects to the same one.
 */
export function SeatPairing({ seatId, step, onDone }: { seatId: string; step?: StepId; onDone: () => void }) {
	const { settings, saveSettings, connect, disconnect, identify, forgetSeatHardware, unavailableReason } =
		useMonitor();
	const { seat, state } = useSeat(seatId);
	const strings = useStrings();
	const t = strings.pairing;
	const childName = seat?.childName ?? "";
	const identifySeat = useCallback(() => identify(seatId), [identify, seatId]);
	const [searching, setSearching] = useState(false);
	const [failures, setFailures] = useState(0);
	const [wrongSeat, setWrongSeat] = useState(false);
	const [blink, setBlink] = useState<Blink>("idle");
	const [seen, setSeen] = useState({ link: state.link, error: state.error });

	// A search ends connected, or back at idle with an error saying why. Checked
	// while rendering (React's pattern for reacting to a changed value) rather
	// than in an effect, so there's no extra render with stale state.
	if (seen.link !== state.link || seen.error !== state.error) {
		setSeen({ link: state.link, error: state.error });
		if (state.link !== "connected") setBlink("idle");
		if (searching && (state.link === "connected" || (state.link === "idle" && state.error))) {
			setSearching(false);
			if (state.link === "idle") setFailures((n) => n + 1);
		}
	}

	// Once connected to a real seat, ask it to blink so the user can confirm it's theirs.
	useEffect(() => {
		if (state.link !== "connected" || state.source !== "ble" || blink !== "idle") return;
		let cancelled = false;
		identifySeat()
			.then(() => !cancelled && setBlink("blinking"))
			.catch(() => !cancelled && setBlink("unsupported"));
		return () => {
			cancelled = true;
		};
	}, [state.link, state.source, blink, identifySeat]);

	const find = () => {
		setWrongSeat(false);
		setSearching(true);
		connect(seatId);
	};

	const blinkAgain = () => void identifySeat().catch(() => setBlink("unsupported"));

	// Forgets that hardware too, so the next search finds a different seat.
	const notMine = () => {
		setWrongSeat(true);
		setFailures((n) => n + 1);
		void forgetSeatHardware(seatId);
	};

	const switchToSimulator = () => {
		setFailures(0);
		setWrongSeat(false);
		void saveSettings({ ...settings, useSimulator: true });
	};
	const next = onDone;

	if (unavailableReason) {
		return (
			<OnboardingScreen
				step={step}
				icon="antenna.radiowaves.left.and.right.slash"
				title={t.findTitle(childName)}
				body={t.noBluetooth}>
				<Notice
					tone="warning"
					actions={
						<Button
							title={strings.common.useSimulatedSeat}
							variant="secondary"
							onPress={switchToSimulator}
						/>
					}>
					{unavailableReason}
				</Notice>
			</OnboardingScreen>
		);
	}

	if (state.link === "connected") {
		if (state.source === "simulator") {
			return (
				<OnboardingScreen
					step={step}
					icon="checkmark.circle.fill"
					title={t.connected}
					body={t.connectedSimulator}
					actions={<Button title={strings.common.continue} onPress={next} />}
				/>
			);
		}
		if (blink === "blinking") {
			return (
				<OnboardingScreen
					step={step}
					icon="lightbulb.fill"
					title={t.blinkingTitle(childName)}
					body={t.blinkingBody}
					actions={
						<>
							<Button title={t.yesMine} onPress={next} />
							<Button title={t.blinkAgain} variant="secondary" onPress={blinkAgain} />
							<Button
								title={t.notMine}
								variant="secondary"
								onPress={notMine}
							/>
						</>
					}
				/>
			);
		}
		if (blink === "unsupported") {
			return (
				<OnboardingScreen
					step={step}
					icon="checkmark.circle.fill"
					title={t.connected}
					body={t.talking(state.deviceName)}
					actions={<Button title={strings.common.continue} onPress={next} />}
				/>
			);
		}
	}

	const busy = state.link !== "idle";
	if (busy) {
		return (
			<OnboardingScreen
				step={step}
				icon="dot.radiowaves.left.and.right"
				title={t.lookingTitle}
				body={state.link === "reconnecting" ? t.slipped : t.hangTight}
				actions={<Button title={strings.common.cancel} variant="secondary" onPress={() => disconnect(seatId)} />}>
				<ActivityIndicator size="large" color={colors.text} style={styles.spinner} />
			</OnboardingScreen>
		);
	}

	if (failures === 0) {
		return (
			<OnboardingScreen
				step={step}
				icon="dot.radiowaves.left.and.right"
				title={t.findTitle(childName)}
				body={t.findBody}
				actions={<Button title={t.find} onPress={find} />}
			/>
		);
	}

	return (
		<OnboardingScreen
			step={step}
			icon={wrongSeat ? "location.magnifyingglass" : "magnifyingglass"}
			title={wrongSeat ? t.wrongSeatTitle : t.notFoundTitle(childName)}
			body={wrongSeat ? t.wrongSeatBody : t.tip}
			actions={
				<>
					<Button title={strings.common.tryAgain} onPress={find} />
					{failures >= 2 && SUPPORT_PHONE_NUMBER && (
						<Button title={t.callForHelp} variant="secondary" onPress={callSupport} />
					)}
					<Button
						title={t.useSimulatorDemo}
						variant="secondary"
						onPress={switchToSimulator}
					/>
				</>
			}>
			{state.error && !wrongSeat ? <Text style={styles.detail}>{state.error}</Text> : null}
		</OnboardingScreen>
	);
}

const styles = StyleSheet.create({
	spinner: { marginTop: 32, alignSelf: "flex-start" },
	detail: { fontSize: 16, lineHeight: 22, color: colors.secondary },
});
