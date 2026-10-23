import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScreenScrollView } from '../components/ScreenScrollView';
import { Icon, SPACE, Text, night } from '../components/ui';
import { LANGUAGES, LANGUAGE_NAMES, type Language } from '../i18n/i18n';
import { useLanguage, useStrings } from '../i18n/useStrings';
import { useMonitor } from '../monitor/MonitorProvider';
import type { OnboardingPath } from './flow';
import { Choice } from './OnboardingScreen';

/** So VoiceOver reads each language's name in that language. */
const VOICEOVER_LANGUAGES: Record<Language, string> = { en: 'en-US', es: 'es-US' };

/**
 * The title card: set up your own seat, or join one a parent already set up,
 * log in, and a switch between English and Spanish. The only dark screen (see
 * docs/design.md). It opens setup (src/app/onboarding/index.tsx) and shows
 * again after logging out (src/app/logged-out.tsx); each says where its
 * choices lead.
 */
export function TitleCard({ onStart, onLogIn }: { onStart(path: OnboardingPath): void; onLogIn(): void }) {
  const { settings, saveSettings } = useMonitor();
  const t = useStrings();
  const language = useLanguage();
  // Light status bar text on the dark ground, only while this screen is showing.
  const focused = useIsFocused();
  return (
    <View style={styles.screen}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        alwaysBounceVertical={false}
      >
        <StatusBar style={focused ? 'light' : 'dark'} />
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            {t.appName}
          </Text>
          <Text style={styles.hello}>{t.onboarding.titleCard.hello}</Text>
        </View>
        <View style={styles.choices}>
          <Choice
            night
            icon="person.fill"
            titleSize={18}
            title={t.onboarding.titleCard.self}
            detail={t.onboarding.titleCard.selfDetail}
            onPress={() => onStart('self')}
          />
          <Choice
            night
            icon="envelope.open.fill"
            titleSize={18}
            title={t.onboarding.titleCard.invite}
            detail={t.onboarding.titleCard.inviteDetail}
            onPress={() => onStart('invite')}
          />
          <Pressable accessibilityRole="button" onPress={onLogIn} style={styles.logIn}>
            {({ pressed }) => (
              <Text style={[styles.logInText, pressed && styles.logInPressed]}>
                {t.onboarding.titleCard.haveAccount}{' '}
                <Text style={styles.logInLink}>{t.onboarding.titleCard.logIn}</Text>
              </Text>
            )}
          </Pressable>
        </View>
        <View style={styles.languages} accessibilityRole="radiogroup" accessibilityLabel={t.settings.language}>
          <Icon name="globe" size={18} color={night.secondary} />
          {LANGUAGES.map((l) => {
            const selected = l === language;
            return (
              <Pressable
                key={l}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLanguage={VOICEOVER_LANGUAGES[l]}
                hitSlop={6}
                onPress={() => void saveSettings({ ...settings, language: l })}
                style={[styles.language, selected && styles.languageSelected]}
              >
                <Text style={[styles.languageText, selected && styles.languageTextSelected]}>{LANGUAGE_NAMES[l]}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: 36, paddingHorizontal: SPACE + 4, paddingVertical: SPACE },
  heading: { alignItems: 'center', gap: 10 },
  title: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '600',
    color: night.text,
    textAlign: 'center',
    // Night's glow: white light around a hovered letter on the landing page.
    textShadowColor: 'rgba(255, 255, 255, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  hello: { fontSize: 18, lineHeight: 25, color: night.secondary, textAlign: 'center' },
  choices: { gap: 12 },
  logIn: { minHeight: 44, justifyContent: 'center' },
  logInText: { fontSize: 16, lineHeight: 22, color: night.secondary, textAlign: 'center' },
  logInLink: { fontSize: 16, fontWeight: '600', color: night.text },
  logInPressed: { opacity: 0.6 },
  languages: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 },
  language: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: night.hairline,
  },
  languageSelected: { backgroundColor: 'rgba(250, 235, 215, 0.14)', borderColor: 'rgba(250, 235, 215, 0.4)' },
  languageText: { fontSize: 15, fontWeight: '600', color: night.secondary },
  languageTextSelected: { color: night.text },
});
