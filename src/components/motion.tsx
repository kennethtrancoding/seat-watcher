import { useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

/**
 * Shared motion (docs/design.md). Everything moves with `transform`, so
 * nothing reflows, and under Reduce Motion every state still appears; it just
 * arrives instead of traveling.
 */

// One subscription to the Reduce Motion setting, shared by every component.
let reduceMotion = false;
let watching = false;
const listeners = new Set<() => void>();
const setReduceMotion = (on: boolean) => {
  reduceMotion = on;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  if (!watching) {
    watching = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** True while Reduce Motion is on in iOS Settings. */
export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, () => reduceMotion);
}

// The spring's fourth control point sits at 1.71, so it overshoots its
// resting size before settling.
const SPRING = Easing.bezier(0.75, 0.05, 0.51, 1.71);

/**
 * Press and spring: sinks on touch, then springs back past full size. Spread
 * `handlers` onto a Pressable and `style` onto what should move. Pass
 * `enabled: false` for Liquid Glass, which has its own press response.
 */
export function usePressSpring({ depth = 0.96, enabled = true }: { depth?: number; enabled?: boolean } = {}) {
  const reduce = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const on = enabled && !reduce;
  const to = (toValue: number, duration: number, easing: (t: number) => number) =>
    Animated.timing(scale, { toValue, duration, easing, useNativeDriver: true }).start();
  return {
    style: { transform: [{ scale }] },
    handlers: {
      onPressIn: () => on && to(depth, 60, Easing.in(Easing.ease)),
      onPressOut: () => on && to(1, 220, SPRING),
    },
  };
}
