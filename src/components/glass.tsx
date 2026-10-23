import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
  type GlassColorScheme,
} from 'expo-glass-effect';
import { useSyncExternalStore, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

// Liquid Glass needs iOS 26 or later. Some iOS 26 betas lack the API and crash
// when it's used, so both checks are needed (see the expo-glass-effect docs).
const SUPPORTED = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

// Reduce Transparency in iOS Settings turns glass into solid fills. One
// subscription shared by every Glass on screen.
let reduceTransparency = false;
const listeners = new Set<() => void>();
const setReduceTransparency = (on: boolean) => {
  reduceTransparency = on;
  listeners.forEach((listener) => listener());
};
if (SUPPORTED) {
  void AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency);
  AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency);
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** True when Liquid Glass can be drawn: iOS 26+, with Reduce Transparency off. */
export function useGlass(): boolean {
  const reduce = useSyncExternalStore(subscribe, () => reduceTransparency);
  return SUPPORTED && !reduce;
}

/**
 * A Liquid Glass surface for controls (buttons, choices). Everywhere glass
 * can't be drawn it's a plain View filled with `fallback`, so give every Glass
 * a fallback that looks right on its own.
 */
export function Glass({
  fallback,
  tint,
  interactive,
  solid,
  scheme,
  style,
  children,
}: {
  fallback: string;
  /** Colors the glass, e.g. ink for a primary button. */
  tint?: string;
  /** Lets the glass react to touch (iOS's own press highlight). */
  interactive?: boolean;
  /** Always the solid fill, e.g. for a disabled button. */
  solid?: boolean;
  scheme?: GlassColorScheme;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const glass = useGlass();
  if (!glass || solid) return <View style={[style, { backgroundColor: fallback }]}>{children}</View>;
  return (
    <GlassView tintColor={tint} isInteractive={interactive} colorScheme={scheme} style={style}>
      {children}
    </GlassView>
  );
}
