import { SymbolView, type AnimationSpec, type SFSymbol } from "expo-symbols";
import { createContext, useContext, useState, type ReactNode } from "react";
import {
	Animated,
	Pressable,
	Text as NativeText,
	StyleSheet,
	Switch as NativeSwitch,
	TextInput,
	View,
	type StyleProp,
	type SwitchProps,
	type TextInputProps,
	type TextProps,
	type TextStyle,
	type ViewStyle,
} from "react-native";

import { Glass, useGlass } from "./glass";
import { usePressSpring, useReduceMotion } from "./motion";

/**
 * Day on iPhone (docs/design.md): ink on paper, antiquewhite as the only
 * highlight, SF Pro, and Liquid Glass on the controls. No accent: the thing to
 * tap is ink. Red (`alarm`) is the one state color, kept for an alert about
 * the child.
 */
export const colors = {
	background: "#FAFAFA", // paper
	text: "#0A0A0A", // ink
	secondary: "rgba(10, 10, 10, 0.62)",
	/** The edge of a control that isn't glass (a text field), 3:1 on paper. */
	edge: "rgba(10, 10, 10, 0.45)",
	hairline: "rgba(10, 10, 10, 0.12)",
	/** Controls without glass: a secondary button, a choice. */
	surface: "#FFFFFF",
	/** Paper-colored text on ink: the primary button's label. */
	onInk: "#FAFAFA",
	/** Antiquewhite: the thread from the website. A fill behind ink, never text
	 * or a line. */
	highlight: "#FAEBD7",
	alarm: "#C8102E",
	onAlarm: "#FFFFFF",
};

/** The title card's palette: antiquewhite on a ground two points off black. */
export const night = {
	background: "#121212",
	text: "#FAEBD7",
	secondary: "rgba(250, 235, 215, 0.62)",
	hairline: "rgba(250, 235, 215, 0.14)",
};

/**
 * The iOS text styles in SF Pro, the system font (leave `fontFamily` unset).
 * Regular to read, semibold to label, bold for titles and readings.
 */
export const textStyles = {
	largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700" },
	title: { fontSize: 22, lineHeight: 28, fontWeight: "600" },
	/** A live number: bold, with figures that don't shift as they change. */
	reading: { fontSize: 34, lineHeight: 40, fontWeight: "700", fontVariant: ["tabular-nums"] },
	headline: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
	body: { fontSize: 17, lineHeight: 24 },
	/** The explanation on a setup screen. */
	lead: { fontSize: 19, lineHeight: 27 },
	subhead: { fontSize: 15, lineHeight: 21 },
	/** Only for what can be skipped; never instructions. */
	footnote: { fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

/** Page padding and the gap between things on a screen. */
export const SPACE = 18;

const TextScaleContext = createContext(1);

/** Provides the Comfort text size (TEXT_SCALE in settings.ts) to every `Text`
 * below it. */
export const TextScaleProvider = TextScaleContext.Provider;

/** For sizing things other than `Text` (text inputs, avatars) with the Comfort
 * text size. */
export function useTextScale(): number {
	return useContext(TextScaleContext);
}

/**
 * React Native's Text, scaled by the text size picked in Comfort settings (on
 * top of the iOS text size). Use it instead of react-native's Text. Only a
 * `fontSize` set in the style is scaled, so give every Text one.
 */
export function Text({ style, ...props }: TextProps) {
	const scale = useTextScale();
	const { fontSize, lineHeight } = StyleSheet.flatten(style) ?? {};
	if (scale === 1 || fontSize === undefined) return <NativeText style={style} {...props} />;
	const scaled: TextStyle = { fontSize: fontSize * scale };
	if (lineHeight !== undefined) scaled.lineHeight = lineHeight * scale;
	return <NativeText style={[style, scaled]} {...props} />;
}

/** An SF Symbol. Decorative: VoiceOver skips it, so say the same thing in text.
 * */
export function Icon({
	name,
	size = 22,
	color = colors.text,
	animation,
}: {
	name: SFSymbol;
	size?: number;
	color?: string;
	/** An SF Symbols effect, e.g. a bounce when it appears. Skipped under Reduce
	 * Motion. */
	animation?: AnimationSpec;
}) {
	const reduceMotion = useReduceMotion();
	return (
		<SymbolView
			name={name}
			size={size}
			tintColor={color}
			animationSpec={reduceMotion ? undefined : animation}
			accessible={false}
		/>
	);
}

/** Related things grouped under a hairline, straight on the paper. Content
 * never sits on a card; glass is for controls. */
export function Section({
	children,
	style,
	accessibilityLabel,
}: {
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
	/** Makes VoiceOver read the group as one item with this label. */
	accessibilityLabel?: string;
}) {
	return (
		<View
			style={[styles.section, style]}
			accessible={accessibilityLabel !== undefined}
			accessibilityLabel={accessibilityLabel}>
			{children}
		</View>
	);
}

/** A group's heading: an ink symbol, then the title. */
export function CardTitle({ icon, children }: { icon: SFSymbol; children: string }) {
	return (
		<View style={styles.cardTitle}>
			<Icon name={icon} size={20} />
			<Text accessibilityRole="header" style={styles.cardTitleText}>
				{children}
			</Text>
		</View>
	);
}

export function SectionTitle({ children }: { children: ReactNode }) {
	return (
		<Text accessibilityRole="header" style={styles.sectionTitle}>
			{children}
		</Text>
	);
}

/** A word or two laid on antiquewhite, the way Day marks text: "Watching",
 * "You". `alarm` lays it on red instead, for a reading that's out of range. */
export function Mark({ children, alarm }: { children: string; alarm?: boolean }) {
	return <Text style={[styles.mark, alarm && styles.markAlarm]}>{children}</Text>;
}

const NOTICE_ICONS = {
	info: "info.circle.fill",
	ok: "checkmark.circle.fill",
	warning: "exclamationmark.triangle.fill",
} satisfies Record<string, SFSymbol>;

/** A short message laid on antiquewhite, e.g. what won't work after a
 * permission is declined. The symbol says which kind. */
export function Notice({
	tone,
	children,
	actions,
}: {
	tone: keyof typeof NOTICE_ICONS;
	children: string;
	actions?: ReactNode;
}) {
	return (
		<View style={styles.notice}>
			<View style={styles.noticeRow}>
				<Icon name={NOTICE_ICONS[tone]} size={22} />
				<Text style={styles.noticeText}>{children}</Text>
			</View>
			{actions ? <View style={styles.noticeActions}>{actions}</View> : null}
		</View>
	);
}

/** Each button's colors: `tint` on Liquid Glass, `fill` and `edge` without it. */
const BUTTONS = {
	primary: { fill: colors.text, tint: colors.text, label: colors.onInk, edge: undefined },
	secondary: { fill: colors.surface, tint: undefined, label: colors.text, edge: colors.edge },
	selected: { fill: colors.highlight, tint: colors.highlight, label: colors.text, edge: colors.text },
	danger: { fill: colors.alarm, tint: colors.alarm, label: colors.onAlarm, edge: undefined },
	onColor: {
		fill: "rgba(255, 255, 255, 0.22)",
		tint: "rgba(255, 255, 255, 0.2)",
		label: "#FFFFFF",
		edge: undefined,
	},
	disabled: { fill: "rgba(10, 10, 10, 0.06)", tint: undefined, label: "rgba(10, 10, 10, 0.38)", edge: undefined },
};

/**
 * A capsule button. On iOS 26 it's Liquid Glass (the primary one tinted ink);
 * elsewhere it's a solid fill with the same colors. Full width unless
 * `compact`. In a set of options, `selected` marks the chosen one with
 * antiquewhite and a check mark.
 */
export function Button({
	title,
	onPress,
	variant = "primary",
	disabled,
	compact,
	selected,
	onColor,
	icon,
	accessibilityHint,
}: {
	title: string;
	onPress: () => void;
	/** `danger` is red, for something that can't be undone (the factory reset).
	 * */
	variant?: "primary" | "secondary" | "danger";
	disabled?: boolean;
	compact?: boolean;
	/** For a button in a set of options: marks the chosen one, and tells
	 * VoiceOver. */
	selected?: boolean;
	/** White glass, for a colored or dark background (the alarm). */
	onColor?: boolean;
	icon?: SFSymbol;
	accessibilityHint?: string;
}) {
	const glass = useGlass();
	const spring = usePressSpring({ enabled: !glass });
	const look = disabled
		? BUTTONS.disabled
		: onColor
			? BUTTONS.onColor
			: selected
				? BUTTONS.selected
				: BUTTONS[variant];
	const height = compact ? 40 : variant === "secondary" ? 52 : 56;
	// The check mark, not just the fill, says which option is chosen.
	const symbol = selected ? "checkmark" : icon;
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled: !!disabled, selected }}
			accessibilityHint={accessibilityHint}
			onPress={onPress}
			disabled={disabled}
			{...spring.handlers}
			style={compact ? styles.fit : styles.full}>
			<Animated.View style={spring.style}>
				<Glass
					fallback={look.fill}
					tint={look.tint}
					interactive={!disabled}
					solid={disabled}
					scheme={onColor ? "dark" : undefined}
					style={[
						styles.capsule,
						{
							minHeight: height,
							borderRadius: height / 2,
							paddingHorizontal: compact ? 16 : 22,
						},
						!glass && look.edge
							? { borderWidth: selected ? 1.5 : 1, borderColor: look.edge }
							: null,
					]}>
					{symbol ? <Icon name={symbol} size={compact ? 15 : 18} color={look.label} /> : null}
					<Text
						style={[
							styles.buttonText,
							compact && styles.buttonTextCompact,
							{ color: look.label },
						]}>
						{title}
					</Text>
				</Glass>
			</Animated.View>
		</Pressable>
	);
}

/** A row of compact option buttons (units, text sizes, minutes). Pass
 * `selected` to each. */
export function Options({ children }: { children: ReactNode }) {
	return <View style={styles.options}>{children}</View>;
}

/** The iOS switch in ink. */
export function Switch(props: SwitchProps) {
	return <NativeSwitch trackColor={{ true: colors.text }} {...props} />;
}

/** A labelled text box with large text, for setup and other forms. Its edge
 * turns to a 2pt ink line while it has focus. */
export function TextField({
	label,
	error,
	hint,
	style,
	onFocus,
	onBlur,
	...props
}: TextInputProps & { label: string; error?: string; hint?: string }) {
	const scale = useTextScale();
	const [focused, setFocused] = useState(false);
	return (
		<View style={styles.field}>
			<Text style={styles.fieldLabel}>{label}</Text>
			<TextInput
				accessibilityLabel={label}
				accessibilityHint={error ?? hint}
				placeholderTextColor={colors.secondary}
				cursorColor={colors.text}
				selectionColor={colors.text}
				onFocus={(e) => {
					setFocused(true);
					onFocus?.(e);
				}}
				onBlur={(e) => {
					setFocused(false);
					onBlur?.(e);
				}}
				style={[
					styles.input,
					{ fontSize: 21 * scale },
					focused && styles.inputFocused,
					error ? styles.inputError : null,
					style,
				]}
				{...props}
			/>
			{error ? (
				<FieldError>{error}</FieldError>
			) : hint ? (
				<Text style={styles.fieldHint}>{hint}</Text>
			) : null}
		</View>
	);
}

/** A problem with what was typed. */
export function FieldError({ children }: { children: string }) {
	return (
		<View
			style={styles.fieldErrorRow}
			accessible
			accessibilityLiveRegion="polite"
			accessibilityLabel={children}>
			<Icon name="exclamationmark.circle.fill" size={17} color={colors.alarm} />
			<Text style={styles.fieldError}>{children}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	section: {
		paddingTop: 16,
		paddingBottom: 6,
		gap: 14,
		borderTopWidth: 1,
		borderTopColor: colors.hairline,
	},
	cardTitle: { flexDirection: "row", alignItems: "center", gap: 10 },
	cardTitleText: { flex: 1, fontSize: 20, lineHeight: 25, fontWeight: "600", color: colors.text },
	sectionTitle: { ...textStyles.title, color: colors.text, marginTop: 22 },
	mark: {
		...textStyles.subhead,
		fontWeight: "600",
		color: colors.text,
		backgroundColor: colors.highlight,
		alignSelf: "flex-start",
		paddingHorizontal: 6,
	},
	markAlarm: { color: colors.onAlarm, backgroundColor: colors.alarm },
	notice: { backgroundColor: colors.highlight, padding: 16, gap: 12 },
	noticeRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
	noticeText: { ...textStyles.body, flex: 1, color: colors.text },
	noticeActions: { gap: 8 },
	full: { alignSelf: "stretch" },
	fit: { alignSelf: "flex-start", maxWidth: "100%", flexShrink: 1 },
	capsule: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 8,
	},
	buttonText: { flexShrink: 1, fontSize: 17, fontWeight: "600", textAlign: "center" },
	buttonTextCompact: { fontSize: 15 },
	options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	field: { gap: 8 },
	fieldLabel: { ...textStyles.subhead, fontWeight: "600", color: colors.secondary },
	input: {
		minHeight: 56,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.edge,
		color: colors.text,
	},
	// One point thicker, so the padding gives one point back and the text holds still.
	inputFocused: { borderWidth: 2, borderColor: colors.text, paddingHorizontal: 15, paddingVertical: 11 },
	inputError: { borderWidth: 2, borderColor: colors.alarm, paddingHorizontal: 15, paddingVertical: 11 },
	fieldErrorRow: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
	fieldError: { ...textStyles.subhead, flex: 1, color: colors.alarm },
	fieldHint: { ...textStyles.subhead, color: colors.secondary },
});
