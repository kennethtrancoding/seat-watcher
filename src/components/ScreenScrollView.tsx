import { Platform, ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenScrollViewProps extends ScrollViewProps {
  /**
   * The screen's header has a large title (`headerLargeTitle`). On iOS the
   * content then starts under the header, and the scroll view has to inset it
   * itself, which also lets the title shrink as the list scrolls. Without
   * that, the top of the list hid under the header and scrolling snapped back.
   */
  largeTitle?: boolean;
}

/** Bound the viewport inside the safe area before flex-growing its content.
 * Native stacks already consume their header inset; headerless screens retain
 * it. Keeping insets outside the scroll content avoids stretching a footer
 * below the visible viewport, and applies the same spacing on Android. A
 * large title is the exception: see `largeTitle`. */
export function ScreenScrollView({ style, largeTitle = false, ...props }: ScreenScrollViewProps) {
  const nativeInsets = largeTitle && Platform.OS === 'ios';
  const scrollView = (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      {...props}
      style={[styles.viewport, style]}
      contentInsetAdjustmentBehavior={nativeInsets ? 'automatic' : 'never'}
      automaticallyAdjustContentInsets={false}
    />
  );
  if (nativeInsets) return scrollView;
  return <SafeAreaView style={styles.viewport}>{scrollView}</SafeAreaView>;
}

const styles = StyleSheet.create({ viewport: { flex: 1 } });
