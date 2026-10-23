import { StyleSheet, View } from 'react-native';

import { speak } from '../../comfort/speech';
import { Button, Section, Switch, Text, colors } from '../../components/ui';
import { useStrings } from '../../i18n/useStrings';
import { useMonitor } from '../../monitor/MonitorProvider';
import { useOnboarding } from '../../onboarding/OnboardingProvider';
import { Choice, OnboardingScreen } from '../../onboarding/OnboardingScreen';
import { TEXT_SCALE, TEXT_SIZES, type TextSize } from '../../settings/settings';

/** First, because text size and reading aloud apply to every screen after this one. */
export default function ComfortScreen() {
  const { settings, saveSettings } = useMonitor();
  const { goNext } = useOnboarding();
  const t = useStrings();

  // Saved as soon as they're picked, so this screen changes size right away.
  const setTextSize = (textSize: TextSize) => void saveSettings({ ...settings, textSize });
  const setReadAloud = (readAloud: boolean) => {
    void saveSettings({ ...settings, readAloud });
    if (readAloud) void speak(t.common.readAloudOn);
  };

  return (
    <OnboardingScreen
      step="comfort"
      icon="textformat.size"
      title={t.onboarding.comfort.title}
      body={t.onboarding.comfort.body}
      actions={<Button title={t.onboarding.comfort.done} onPress={() => goNext('comfort')} />}
    >
      <View accessibilityRole="radiogroup" accessibilityLabel={t.common.textSize} style={styles.sizes}>
        {TEXT_SIZES.map((size) => (
          <Choice
            key={size}
            title={t.settings.textSizes[size]}
            // Each option previews its own size, before the app-wide scale is applied.
            titleSize={(21 * TEXT_SCALE[size]) / TEXT_SCALE[settings.textSize]}
            selected={settings.textSize === size}
            onPress={() => setTextSize(size)}
          />
        ))}
      </View>
      <Section style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={styles.switchLabel}>{t.common.readAloud}</Text>
          <Text style={styles.switchHint}>{t.onboarding.comfort.readAloudHint}</Text>
        </View>
        <Switch value={settings.readAloud} onValueChange={setReadAloud} accessibilityLabel={t.common.readAloud} />
      </Section>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  sizes: { gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16 },
  switchText: { flex: 1, gap: 4 },
  switchLabel: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: colors.text },
  switchHint: { fontSize: 15, lineHeight: 21, color: colors.secondary },
});
