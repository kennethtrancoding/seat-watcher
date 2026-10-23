import { ScreenScrollView } from '../components/ScreenScrollView';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { accountErrorMessage } from '../account/server';
import type { AlertDelivery, TeamAlert, TeamAlertKind } from '../account/teamAlerts';
import { useTeam } from '../account/TeamProvider';
import { Hint, NumberField, SwitchField } from '../components/fields';
import { Button, Notice, SPACE, Section, SectionTitle, Text, colors } from '../components/ui';
import { locale } from '../i18n/i18n';
import { useStrings } from '../i18n/useStrings';
import { useMonitor } from '../monitor/MonitorProvider';
import { useFactoryReset } from '../monitor/useFactoryReset';
import { useOnboarding } from '../onboarding/OnboardingProvider';
import { ownSeats } from '../seats/seats';
import { DEFAULT_SETTINGS, parseNumberInput, type Settings } from '../settings/settings';
import { useAutosavedDraft } from '../settings/useAutosavedDraft';

/**
 * Tuning, calibration and testing, kept out of the main Settings screen.
 * The switch applies right away; typed values save once they're checked (see useAutosavedDraft).
 */

type TuningKey = 'occupancyPressureThreshold' | 'rssiAt1m' | 'pathLossExponent' | 'alertCooldownMinutes';
type Draft = Record<TuningKey, string>;

const TUNING_KEYS: TuningKey[] = ['occupancyPressureThreshold', 'rssiAt1m', 'pathLossExponent', 'alertCooldownMinutes'];

function toDraft(s: Settings): Draft {
  return {
    occupancyPressureThreshold: String(s.occupancyPressureThreshold),
    rssiAt1m: String(s.rssiAt1m),
    pathLossExponent: String(s.pathLossExponent),
    alertCooldownMinutes: String(s.alertCooldownMinutes),
  };
}

function fromDraft(d: Draft, s: Settings): Settings {
  const next = { ...s };
  for (const key of TUNING_KEYS) next[key] = parseNumberInput(d[key]);
  return next;
}

export default function DeveloperScreen() {
  const { settings, saveSettings, seats, seatStates } = useMonitor();
  const { restart } = useOnboarding();
  const factoryReset = useFactoryReset();
  const t = useStrings();
  const d = t.developer;
  const { pretend, ownTeam, helping } = useTeam();
  // What the last account server tool did.
  const [serverResult, setServerResult] = useState<string | null>(null);
  const [alertLog, setAlertLog] = useState<{ alert: TeamAlert; deliveries: AlertDelivery[] }[]>([]);

  // Reloaded when the server changes (the teams reload then), and as time
  // passes, since that's what brings the helpers' turn.
  useEffect(() => {
    if (!pretend) return;
    let current = true;
    const load = () =>
      void pretend
        .alertLog()
        .then((log) => current && setAlertLog(log))
        .catch(() => {});
    load();
    const timer = setInterval(load, 10_000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [pretend, ownTeam, helping]);

  const name = (delivery: AlertDelivery) => delivery.member.name || t.common.someone;
  const deliveryLine = (kind: TeamAlertKind, delivery: AlertDelivery) => {
    const at = formatTime(delivery.at);
    switch (delivery.reason) {
      case 'raised':
        return d.alertRaised(kind, name(delivery), at);
      case 'owner':
        return d.ownerTold(name(delivery), at);
      case 'backup':
        return delivery.sent ? d.helperTold(name(delivery), at) : d.helperToldLater(name(delivery), at);
    }
  };

  const acceptInvites = () =>
    void pretend
      ?.acceptWaitingInvites()
      .then((count) => setServerResult(d.acceptedInvites(count)))
      .catch((e) => setServerResult(accountErrorMessage(e)));

  const resetServer = () =>
    void pretend
      ?.reset()
      .then(() => setServerResult(d.serverReset))
      .catch((e) => setServerResult(accountErrorMessage(e)));
  const { draft, setDraft, errors, reset } = useAutosavedDraft(toDraft, fromDraft);

  const type = (key: TuningKey) => (text: string) => setDraft((d) => ({ ...d, [key]: text }));
  // Calibrate against whichever seat is connected (the first, if there are several).
  const connected = (list: typeof seats) =>
    list.map((s) => seatStates[s.id]?.state).find((st) => st?.link === 'connected');
  const liveRssi = connected(seats)?.proximity?.rssi;
  // The occupied reading is one of the settings for your own seats, so only they can show it.
  const livePressure = connected(ownSeats(seats))?.pressure ?? null;

  /** Every setting, on this screen and in Settings. Seats, the account and the team stay. */
  const restoreDefaults = () => {
    void saveSettings(DEFAULT_SETTINGS);
    reset(DEFAULT_SETTINGS);
  };

  return (
    <View style={styles.screen}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <Notice tone="info">{d.intro}</Notice>

        <SectionTitle>{d.seat}</SectionTitle>
        <Section>
          <SwitchField
            label={d.simulated}
            value={settings.useSimulator}
            onValueChange={(useSimulator) => void saveSettings({ ...settings, useSimulator })}
            hint={d.simulatedHint}
          />
          <NumberField
            label={d.occupiedAt}
            value={draft.occupancyPressureThreshold}
            onChangeText={type('occupancyPressureThreshold')}
            error={errors.occupancyPressureThreshold}
            hint={
              livePressure !== null ? d.currentReading(livePressure) : d.rawUnits
            }
          />
          <Hint>{d.ownSeatsOnly}</Hint>
        </Section>

        <SectionTitle>{d.calibration}</SectionTitle>
        <Section>
          <NumberField
            label={d.signalAt1m}
            suffix="dBm"
            value={draft.rssiAt1m}
            onChangeText={type('rssiAt1m')}
            error={errors.rssiAt1m}
            hint={d.signalAt1mHint}
            allowNegative
          />
          <Button
            compact
            variant="secondary"
            icon="scope"
            title={liveRssi !== undefined ? d.useCurrentSignal(Math.round(liveRssi)) : d.connectToCalibrate}
            disabled={liveRssi === undefined}
            onPress={() => liveRssi !== undefined && type('rssiAt1m')(String(Math.round(liveRssi)))}
          />
          <NumberField
            label={d.pathLoss}
            value={draft.pathLossExponent}
            onChangeText={type('pathLossExponent')}
            error={errors.pathLossExponent}
            hint={d.pathLossHint}
          />
        </Section>

        <SectionTitle>{d.alerts}</SectionTitle>
        <Section>
          <NumberField
            label={d.repeatEvery}
            suffix={t.common.minutes}
            value={draft.alertCooldownMinutes}
            onChangeText={type('alertCooldownMinutes')}
            error={errors.alertCooldownMinutes}
            hint={d.repeatHint}
          />
        </Section>

        <View style={styles.actions}>
          <Hint>{t.common.changesSave}</Hint>
        </View>

        {pretend ? (
          <>
            <SectionTitle>{d.accountServer}</SectionTitle>
            <Section>
              <Hint>{d.accountServerHint}</Hint>
              <Button variant="secondary" icon="person.crop.circle.badge.checkmark" title={d.acceptInvites} onPress={acceptInvites} />
              <Hint>{d.acceptInvitesHint}</Hint>
              <Button variant="secondary" icon="arrow.counterclockwise.circle" title={d.resetServer} onPress={resetServer} />
              <Hint>{d.resetServerHint}</Hint>
              {serverResult ? <Notice tone="info">{serverResult}</Notice> : null}
            </Section>

            <SectionTitle>{d.teamAlerts}</SectionTitle>
            <Section>
              <Hint>{d.teamAlertsHint}</Hint>
              {alertLog.length === 0 ? <Hint>{d.noTeamAlerts}</Hint> : null}
              {alertLog.map(({ alert, deliveries }) => (
                <View key={alert.id} style={styles.alert}>
                  <Text style={styles.alertTitle}>
                    {d.teamAlert(
                      alert.kind,
                      alert.childName,
                      formatTime(alert.raisedAt),
                      alert.endedAt === null ? null : formatTime(alert.endedAt),
                    )}
                  </Text>
                  {deliveries.map((delivery) => (
                    <Text key={delivery.member.id} style={[styles.delivery, !delivery.sent && styles.later]}>
                      {deliveryLine(alert.kind, delivery)}
                    </Text>
                  ))}
                </View>
              ))}
            </Section>
          </>
        ) : null}

        <SectionTitle>{d.startOver}</SectionTitle>
        <Section>
          <Button
            variant="secondary"
            icon="arrow.uturn.backward"
            title={t.common.restoreDefaults}
            onPress={restoreDefaults}
          />
          <Hint>{d.restoreDefaultsHint}</Hint>
          <Button
            variant="secondary"
            icon="arrow.counterclockwise"
            title={d.runSetupAgain}
            onPress={() => void restart()}
          />
          <Hint>{d.runSetupAgainHint}</Hint>
          <Button
            variant="danger"
            icon="trash.fill"
            title={d.factoryReset}
            onPress={() => void factoryReset({ emptyAccountServer: true })}
          />
          <Hint>{d.factoryResetHint}</Hint>
        </Section>
      </ScreenScrollView>
    </View>
  );
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACE, gap: 10, paddingBottom: 48 },
  actions: { gap: 10, marginTop: 16 },
  alert: { gap: 4, paddingVertical: 6 },
  alertTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  delivery: { fontSize: 15, color: colors.text },
  later: { color: colors.secondary },
});
