import { Stack } from 'expo-router';

import { colors, night } from '../../components/ui';
import { useStrings } from '../../i18n/useStrings';

export default function OnboardingLayout() {
  const t = useStrings();
  return (
    <Stack
      screenOptions={{
        title: '',
        headerBackTitle: t.common.back,
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, contentStyle: { backgroundColor: night.background } }} />
      {/* Setup is finished at this point; there's nothing to go back to. */}
      <Stack.Screen name="done" options={{ headerBackVisible: false, gestureEnabled: false }} />
    </Stack>
  );
}
