import { ScreenScrollView } from '../../components/ScreenScrollView';
import { useEffect, useState } from "react";
import {
	AccessibilityInfo,
	Animated,
	Linking,
	Modal,
	StyleSheet,
	Vibration,
	View,
} from "react-native";

import { practiceAlertMessage } from "../../alerts/messages";
import { clearPracticeAlert, sendPracticeAlert } from "../../alerts/notifier";
import { Button, Icon, Notice, Section, Text, colors, textStyles } from "../../components/ui";
import { useStrings } from "../../i18n/useStrings";
import { useMonitor } from "../../monitor/MonitorProvider";
import { useOnboarding } from "../../onboarding/OnboardingProvider";
import { OnboardingScreen } from "../../onboarding/OnboardingScreen";

type Phase = "intro" | "alarm" | "ask" | "notHeard";

// iOS vibrates for a fixed time and treats the numbers as pauses: buzz, wait 600 ms, repeat.
const VIBRATION_PATTERN = [0, 600];
// One flash a second, well under the three a second that can trigger seizures.
const FLASH_HALF_PERIOD_MS = 500;

export default function PracticeScreen() {
	const { seats, notificationsAllowed, criticalAlerts } = useMonitor();
	const { goNext } = useOnboarding();
	const strings = useStrings();
	const t = strings.onboarding.practice;
	const [phase, setPhase] = useState<Phase>("intro");
	const message = practiceAlertMessage(seats[0]?.childName ?? "");

	const start = () => {
		setPhase("alarm");
		Vibration.vibrate(VIBRATION_PATTERN, true);
		// A real notification, so it sounds exactly like an alert would.
		if (notificationsAllowed) void sendPracticeAlert(message).catch(() => {});
	};

	const dismiss = () => {
		Vibration.cancel();
		void clearPracticeAlert();
		setPhase("ask");
	};

	useEffect(() => () => Vibration.cancel(), []);

	const notificationsOff = notificationsAllowed === false && (
		<Notice
			tone="warning"
			actions={
				<Button
					title={strings.common.openSettings}
					variant="secondary"
					onPress={() => void Linking.openSettings()}
				/>
			}>
			{t.notificationsOff}
		</Notice>
	);

	if (phase === "ask") {
		return (
			<OnboardingScreen
				step="practice"
				icon="ear.fill"
				title={t.heardTitle}
				actions={
					<>
						<Button title={t.heard} onPress={() => goNext("practice")} />
						<Button
							title={t.notHeard}
							variant="secondary"
							onPress={() => setPhase("notHeard")}
						/>
					</>
				}
			/>
		);
	}

	const criticalAlertsOff = notificationsAllowed && criticalAlerts === "off" && (
		<Notice
			tone="info"
			actions={
				<Button
					title={strings.common.openSettings}
					variant="secondary"
					onPress={() => void Linking.openSettings()}
				/>
			}>
			{strings.common.criticalAlertsOff}
		</Notice>
	);

	if (phase === "notHeard") {
		const tips = [
			t.tips.volume,
			// Critical alerts ring through Silent mode and Focus anyway.
			...(criticalAlerts === "on" ? [] : [t.tips.silent, t.tips.focus]),
			t.tips.hearingAids,
		];
		return (
			<OnboardingScreen
				step="practice"
				icon="speaker.wave.3.fill"
				title={t.louderTitle}
				body={t.louderBody}
				readAloud={tips.join(" ")}
				actions={
					<>
						<Button title={t.playAgain} onPress={start} />
						<Button
							title={strings.common.continue}
							variant="secondary"
							onPress={() => goNext("practice")}
						/>
					</>
				}>
				{notificationsOff}
				{criticalAlertsOff}
				<Section style={styles.tips}>
					{tips.map((tip, i) => (
						<View key={tip} style={styles.tip}>
							<Text style={styles.tipNumber}>{i + 1}</Text>
							<Text style={styles.tipText}>{tip}</Text>
						</View>
					))}
				</Section>
			</OnboardingScreen>
		);
	}

	return (
		<>
			<OnboardingScreen
				step="practice"
				icon="bell.and.waves.left.and.right.fill"
				title={t.title}
				body={t.body}
				actions={<Button title={t.play} onPress={start} />}>
				{notificationsOff}
			</OnboardingScreen>
			<PracticeAlarm visible={phase === "alarm"} title={message.title} onDismiss={dismiss} />
		</>
	);
}

/** The full-screen part of the practice alert: flashing (steady with Reduce Motion), until dismissed. */
function PracticeAlarm({
	visible,
	title,
	onDismiss,
}: {
	visible: boolean;
	title: string;
	onDismiss: () => void;
}) {
	const [flash] = useState(() => new Animated.Value(0));
	const t = useStrings().onboarding.practice;

	useEffect(() => {
		if (!visible) return;
		let loop: Animated.CompositeAnimation | undefined;
		let cancelled = false;
		void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
			if (cancelled || reduceMotion) return;
			loop = Animated.loop(
				Animated.sequence([
					Animated.timing(flash, {
						toValue: 1,
						duration: FLASH_HALF_PERIOD_MS,
						useNativeDriver: false,
					}),
					Animated.timing(flash, {
						toValue: 0,
						duration: FLASH_HALF_PERIOD_MS,
						useNativeDriver: false,
					}),
				]),
			);
			loop.start();
		});
		return () => {
			cancelled = true;
			loop?.stop();
			flash.setValue(0);
		};
	}, [visible, flash]);

	const backgroundColor = flash.interpolate({
		inputRange: [0, 1],
		outputRange: [colors.alarm, "#7A0010"],
	});

	return (
		<Modal visible={visible} animationType="fade" onRequestClose={onDismiss}>
			<Animated.View style={[styles.alarm, { backgroundColor }]}>
				<ScreenScrollView contentContainerStyle={styles.alarmContent}>
					<View style={styles.alarmText} accessible accessibilityLiveRegion="assertive">
						<Icon
							name="bell.and.waves.left.and.right.fill"
							size={64}
							color={colors.onAlarm}
							animation={{ effect: { type: "bounce" }, repeating: true }}
						/>
						<Text style={styles.alarmLabel}>{t.justPracticing}</Text>
						<Text style={styles.alarmTitle}>{title}</Text>
					</View>
					<Button title={t.turnOff} onColor icon="xmark" onPress={onDismiss} />
				</ScreenScrollView>
			</Animated.View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	tips: { gap: 16, paddingBottom: 16 },
	tip: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
	tipNumber: { ...textStyles.headline, lineHeight: 25, width: 22, color: colors.text, fontVariant: ["tabular-nums"] },
	tipText: { flex: 1, fontSize: 18, lineHeight: 25, color: colors.text },
	alarm: { flex: 1 },
	alarmContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32, gap: 32, justifyContent: "space-between" },
	alarmText: { gap: 16 },
	alarmLabel: {
		fontSize: 17,
		fontWeight: "600",
		color: colors.onAlarm,
		textTransform: "uppercase",
		letterSpacing: 2,
		opacity: 0.85,
	},
	alarmTitle: { fontSize: 40, lineHeight: 46, fontWeight: "700", color: colors.onAlarm },
});
