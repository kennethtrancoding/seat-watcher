import { ScreenScrollView } from '../components/ScreenScrollView';
import type { SFSymbol } from "expo-symbols";
import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";

import { useReadAloud } from "../comfort/useReadAloud";
import { Glass, useGlass } from "../components/glass";
import { usePressSpring, useReduceMotion } from "../components/motion";
import { Icon, SPACE, Text, colors, night, textStyles } from "../components/ui";
import { useStrings } from "../i18n/useStrings";
import { stepProgress, type StepId } from "./flow";
import { useOnboarding } from "./OnboardingProvider";

/** Joins text into sentences for reading aloud, adding a period where one is missing. */
function sentences(parts: (string | undefined | false)[]): string {
	return parts
		.filter((p): p is string => !!p)
		.map((p) => (/[.?!…]$/.test(p) ? p : `${p}.`))
		.join(" ");
}

/**
 * The frame every setup screen uses: progress, an icon, a large title, a short
 * explanation, the screen's content, and its buttons at the bottom. With
 * "Read screens aloud" on, the title, body and `readAloud` text are read out.
 */
export function OnboardingScreen({
	step,
	icon,
	title,
	body,
	readAloud,
	children,
	actions,
}: {
	step?: StepId;
	/** The SF Symbol above the title, in ink. It bounces in. */
	icon?: SFSymbol;
	title: string;
	body?: string;
	/** More to read aloud after the title and body, e.g. the content of an example. */
	readAloud?: string;
	children?: ReactNode;
	actions?: ReactNode;
}) {
	const { path } = useOnboarding();
	const progress = step ? stepProgress(path, step) : null;
	useReadAloud(sentences([title, body, readAloud]));

	return (
		<View style={styles.screen}>
			<ScreenScrollView
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="interactive"
				automaticallyAdjustKeyboardInsets>
				{progress && <Progress step={progress.step} total={progress.total} />}
				{icon ? (
					<View style={styles.symbol} accessible={false}>
						<Icon name={icon} size={34} animation={{ effect: { type: "bounce" } }} />
					</View>
				) : null}
				<Text accessibilityRole="header" style={styles.title}>
					{title}
				</Text>
				{body ? <Text style={styles.body}>{body}</Text> : null}
				<View style={styles.main}>{children}</View>
				{actions ? <View style={styles.actions}>{actions}</View> : null}
			</ScreenScrollView>
		</View>
	);
}

/** "Step 3 of 10" over Day's 3px rule, which wipes in from the left, picking up
 * where the last screen left off. */
function Progress({ step, total }: { step: number; total: number }) {
	const reduceMotion = useReduceMotion();
	const t = useStrings();
	const [fraction] = useState(() => new Animated.Value((step - 1) / total));
	useEffect(() => {
		if (reduceMotion) {
			fraction.setValue(step / total);
			return;
		}
		const grow = Animated.timing(fraction, {
			toValue: step / total,
			duration: 450,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		});
		grow.start();
		return () => grow.stop();
	}, [step, total, reduceMotion, fraction]);
	return (
		<View
			accessible
			accessibilityRole="progressbar"
			accessibilityLabel={t.onboarding.step(step, total)}
			accessibilityValue={{ min: 0, max: total, now: step }}
			style={styles.progress}>
			<Text style={styles.progressText}>{t.onboarding.step(step, total)}</Text>
			<View style={styles.track}>
				<Animated.View style={[styles.fill, { transform: [{ scaleX: fraction }] }]} />
			</View>
		</View>
	);
}

/**
 * A large tappable card: a way in, a text size, and so on. Liquid Glass on
 * iOS 26, a white card with an ink edge elsewhere. A selected option is tinted
 * antiquewhite and checked.
 */
export function Choice({
	title,
	detail,
	selected,
	onPress,
	titleSize = 20,
	icon,
	night: onNight,
}: {
	title: string;
	detail?: string;
	/** Shows a check mark when true; leave undefined for cards that navigate. */
	selected?: boolean;
	onPress: () => void;
	/** Lets the text-size choices show their own size. */
	titleSize?: number;
	icon?: SFSymbol;
	/** Antiquewhite on dark glass, for the title card. */
	night?: boolean;
}) {
	const selectable = selected !== undefined;
	const glass = useGlass();
	const spring = usePressSpring({ enabled: !glass });
	const text = onNight ? night.text : colors.text;
	const quiet = onNight ? night.secondary : colors.secondary;
	return (
		<Pressable
			accessibilityRole={selectable ? "radio" : "button"}
			accessibilityState={selectable ? { checked: selected } : undefined}
			accessibilityLabel={detail ? `${title}. ${detail}` : title}
			onPress={onPress}
			{...spring.handlers}>
			<Animated.View style={spring.style}>
				<Glass
					fallback={onNight ? "rgba(250, 235, 215, 0.08)" : selected ? colors.highlight : colors.surface}
					tint={selected ? colors.highlight : undefined}
					scheme={onNight ? "dark" : undefined}
					interactive
					style={[
						styles.choice,
						!glass && (onNight ? styles.choiceNight : styles.choiceDay),
						!glass && selected && styles.choiceSelected,
					]}>
					{icon ? <Icon name={icon} size={22} color={text} /> : null}
					<View style={styles.choiceText}>
						<Text style={[styles.choiceTitle, { fontSize: titleSize, color: text }]}>{title}</Text>
						{detail ? <Text style={[styles.choiceDetail, { color: quiet }]}>{detail}</Text> : null}
					</View>
					{selectable ? (
						<Icon
							name={selected ? "checkmark.circle.fill" : "circle"}
							size={26}
							color={selected ? colors.text : colors.edge}
						/>
					) : (
						<Icon name="chevron.right" size={16} color={quiet} />
					)}
				</Glass>
			</Animated.View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1 },
	content: { flexGrow: 1, paddingHorizontal: SPACE + 4, paddingTop: 8, paddingBottom: 24, gap: SPACE },
	progress: { gap: 8 },
	progressText: { ...textStyles.subhead, fontWeight: "600", color: colors.secondary },
	track: { height: 3, backgroundColor: colors.hairline, overflow: "hidden" },
	fill: { height: 3, backgroundColor: colors.text, transformOrigin: "left" },
	symbol: { alignSelf: "flex-start", marginTop: 4 },
	title: { ...textStyles.largeTitle, color: colors.text },
	body: { ...textStyles.lead, color: colors.text },
	main: { flexGrow: 1, flexShrink: 0, gap: 12 },
	actions: { flexShrink: 0, gap: 10, marginTop: 8 },
	choice: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		minHeight: 76,
		paddingHorizontal: 18,
		paddingVertical: 16,
		borderRadius: 24,
	},
	choiceDay: { borderWidth: 1, borderColor: colors.edge },
	choiceNight: { borderWidth: 1, borderColor: night.hairline },
	choiceSelected: { borderWidth: 1.5, borderColor: colors.text },
	choiceText: { flex: 1, gap: 3 },
	choiceTitle: { fontWeight: "600" },
	choiceDetail: { ...textStyles.subhead },
});
