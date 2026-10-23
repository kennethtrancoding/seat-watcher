import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { AlertKind, SeatSnapshot } from '../../../alerts/AlertEngine';
import { alertMessage, type AlertMessage } from '../../../alerts/messages';
import { Glass, useGlass } from '../../../components/glass';
import { Button, Icon, Mark, Section, Text, colors, textStyles } from '../../../components/ui';
import type { Strings } from '../../../i18n/i18n';
import { useStrings } from '../../../i18n/useStrings';
import { useMonitor } from '../../../monitor/MonitorProvider';
import type { StepId } from '../../../onboarding/flow';
import { useOnboarding } from '../../../onboarding/OnboardingProvider';
import { OnboardingScreen } from '../../../onboarding/OnboardingScreen';
import { formatTemp, toDisplayTemp, type Settings } from '../../../settings/settings';

type Topic = 'temperature' | 'weight' | 'distance';

/** A made-up moment that sets off `kind`, so the example is the real alert text. */
function exampleAlert(kind: AlertKind, settings: Settings, childName: string): AlertMessage {
  const snapshot: SeatSnapshot = {
    link: 'connected',
    occupied: true,
    temperatureC: settings.maxTempC + 4,
    proximity: { distanceMeters: settings.maxDistanceMeters + 3, rssi: -85, isBeyond: true },
  };
  return alertMessage(kind, snapshot, settings, childName);
}

function content(topic: Topic, settings: Settings, childName: string, t: Strings['onboarding']['watch']) {
  const unit = settings.temperatureUnit;
  switch (topic) {
    case 'temperature':
      return {
        icon: 'thermometer.sun.fill' as const,
        title: t.temperatureTitle,
        body: t.temperatureBody(childName),
        example: exampleAlert('temperatureHigh', settings, childName),
        detail: t.temperatureDetail(
          toDisplayTemp(settings.minTempC, unit).toFixed(0),
          formatTemp(settings.maxTempC, unit, 0),
        ),
      };
    case 'weight':
      return {
        icon: 'figure.and.child.holdinghands' as const,
        title: t.weightTitle,
        body: t.weightBody(childName),
        example: null,
        detail: t.weightDetail,
      };
    case 'distance':
      return {
        icon: 'figure.walk.motion' as const,
        title: t.distanceTitle,
        body: t.distanceBody(childName),
        example: exampleAlert('tooFar', settings, childName),
        detail: t.distanceDetail,
      };
  }
}

/** "What we watch": three short screens, each showing what its alert means. */
export default function WatchScreen() {
  const topic = useLocalSearchParams<{ topic: Topic }>().topic;
  const step = `watch/${topic}` as StepId;
  const { settings, seats } = useMonitor();
  const { goNext } = useOnboarding();
  const strings = useStrings();
  const t = strings.onboarding.watch;
  // The examples use the first child's name; every seat works the same way.
  const childName = seats[0]?.childName ?? '';
  const c = content(topic, settings, childName, t) ?? content('temperature', settings, childName, t);
  const glass = useGlass();

  return (
    <OnboardingScreen
      step={step}
      icon={c.icon}
      title={c.title}
      body={c.body}
      readAloud={[c.example && `${t.exampleLabel}: ${c.example.title}`, c.detail].filter(Boolean).join('. ')}
      actions={<Button title={t.gotIt} onPress={() => goNext(step)} />}
    >
      {c.example ? (
        <View style={styles.example}>
          <Text style={styles.exampleLabel}>{t.exampleLabel}</Text>
          {/* Drawn like an iOS notification banner. */}
          <View accessible accessibilityLabel={t.example(c.example.title, c.example.body)}>
            <Glass fallback={colors.surface} style={[styles.banner, !glass && styles.bannerEdge]}>
              <View style={styles.appIcon}>
                <Icon name="bell.fill" size={18} color={colors.onInk} />
              </View>
              <View style={styles.bannerText}>
                <View style={styles.bannerHeader}>
                  <Text style={styles.appName}>{strings.appName}</Text>
                  <Text style={styles.when}>{t.now}</Text>
                </View>
                <Text style={styles.bannerTitle}>{c.example.title}</Text>
                <Text style={styles.bannerBody}>{c.example.body}</Text>
              </View>
            </Glass>
          </View>
        </View>
      ) : (
        <View style={styles.example}>
          <Text style={styles.exampleLabel}>{t.inTheApp}</Text>
          {/* Drawn like a reading on the seat's screen. */}
          <Section style={styles.reading}>
            <View style={styles.readingHeader}>
              <Icon name="figure.and.child.holdinghands" size={17} color={colors.secondary} />
              <Text style={styles.readingLabel}>{strings.common.inTheSeat}</Text>
              <Mark>{strings.common.watching}</Mark>
            </View>
            <Text style={styles.readingValue}>{childName || strings.common.someone}</Text>
          </Section>
        </View>
      )}
      <Text style={styles.detail}>{c.detail}</Text>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  example: { gap: 8 },
  exampleLabel: { ...textStyles.subhead, fontWeight: '600', color: colors.secondary },
  // An iOS 26 notification is itself Liquid Glass.
  banner: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 24 },
  bannerEdge: { borderWidth: 1, borderColor: colors.hairline },
  appIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  bannerText: { flex: 1, gap: 2 },
  bannerHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  appName: { ...textStyles.footnote, fontWeight: '600', color: colors.secondary },
  when: { ...textStyles.footnote, color: colors.secondary },
  bannerTitle: { ...textStyles.headline, color: colors.text },
  bannerBody: { fontSize: 16, lineHeight: 21, color: colors.text },
  reading: { gap: 2, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  readingHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  readingLabel: { ...textStyles.subhead, flex: 1, fontWeight: '600', color: colors.secondary },
  readingValue: { ...textStyles.reading, color: colors.text },
  detail: { ...textStyles.body, color: colors.secondary },
});
