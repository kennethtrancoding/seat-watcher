import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Link, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet } from 'react-native';

import { TeamProvider } from '../account/TeamProvider';
import { Icon, TextScaleProvider, colors, night } from '../components/ui';
import { useStrings } from '../i18n/useStrings';
import { MonitorProvider, useMonitor } from '../monitor/MonitorProvider';
import { OnboardingProvider, useOnboarding } from '../onboarding/OnboardingProvider';
import { TEXT_SCALE } from '../settings/settings';

export default function RootLayout() {
  return (
    <MonitorProvider>
      <OnboardingProvider>
        <TeamProvider>
          <StatusBar style="dark" />
          <AppStack />
        </TeamProvider>
      </OnboardingProvider>
    </MonitorProvider>
  );
}

/**
 * Setup screens until setup is finished (see src/onboarding/flow.ts), then
 * the main screens, or the title card and the login screen while logged out.
 */
function AppStack() {
  const { settings } = useMonitor();
  const { completed, phoneNumber } = useOnboarding();
  const strings = useStrings();
  const t = strings.nav;
  const loggedIn = phoneNumber !== null;
  // On the home screen and each seat's screen. iOS 26 puts header buttons on Liquid Glass by itself.
  const settingsButton = () => (
    <Link href="/settings" asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={t.settings} hitSlop={10} style={styles.headerButton}>
        <Icon name="gearshape.fill" size={22} />
      </Pressable>
    </Link>
  );
  return (
    <TextScaleProvider value={TEXT_SCALE[settings.textSize]}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerLargeTitleStyle: { color: colors.text },
        }}
      >
        <Stack.Protected guard={completed && loggedIn}>
          <Stack.Screen
            name="index"
            options={{
              title: t.home,
              headerLargeTitle: true,
              headerRight: settingsButton,
              // From iOS 26 the large title scrolls with the content, underneath
              // the header's background, so a painted background hid it until
              // you pulled down. There iOS fades content under the header itself.
              headerStyle: { backgroundColor: isLiquidGlassAvailable() ? 'transparent' : colors.background },
            }}
          />
          {/* Each seat's screen sets its own title ("Emma's seat"). */}
          <Stack.Screen name="seat/[id]" options={{ title: '', headerRight: settingsButton }} />
          <Stack.Screen name="seat/new" options={{ title: t.addSeat }} />
          <Stack.Screen name="seat/pair" options={{ title: t.pairSeat }} />
          <Stack.Screen name="settings" options={{ title: t.settings }} />
          <Stack.Screen name="seat-settings" options={{ title: t.seatSettings }} />
          <Stack.Screen name="account/index" options={{ title: t.account }} />
          <Stack.Screen name="account/phone" options={{ title: t.changeNumber }} />
          <Stack.Screen name="team" options={{ title: t.team }} />
          <Stack.Screen name="developer" options={{ title: t.developer }} />
        </Stack.Protected>
        <Stack.Protected guard={completed && !loggedIn}>
          {/* Logging out lands on the first one: the title card. */}
          <Stack.Screen
            name="logged-out"
            options={{ headerShown: false, contentStyle: { backgroundColor: night.background } }}
          />
          <Stack.Screen name="login" options={{ title: '', headerBackTitle: strings.common.back }} />
        </Stack.Protected>
        <Stack.Protected guard={!completed}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* Where invite links open, in every state; it sorts out what to show (src/app/invite.tsx). */}
        <Stack.Screen name="invite" options={{ headerShown: false }} />
      </Stack>
    </TextScaleProvider>
  );
}

const styles = StyleSheet.create({
  headerButton: { padding: 4 },
});
