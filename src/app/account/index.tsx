import { ScreenScrollView } from '../../components/ScreenScrollView';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  MAX_PROFILE_NAME_LENGTH,
  RELATIONSHIPS,
  describeAccount,
  formatMonthYear,
  relationshipLabel,
} from '../../account/account';
import { accountErrorMessage } from '../../account/server';
import { Hint, OptionsField } from '../../components/fields';
import { Button, CardTitle, FieldError, SPACE, Section, SectionTitle, Text, TextField, colors, textStyles } from '../../components/ui';
import { useStrings } from '../../i18n/useStrings';
import { useMonitor } from '../../monitor/MonitorProvider';
import { useFactoryReset } from '../../monitor/useFactoryReset';
import { useOnboarding } from '../../onboarding/OnboardingProvider';
import { formatPhoneNumber } from '../../onboarding/phone';
import { ownSeats, seatsPhrase } from '../../seats/seats';

/**
 * The account: who you are, your number, and what's kept where. There's no
 * server, so everything here lives on this phone (see docs/onboarding.md).
 */
export default function AccountScreen() {
  const { account, phoneNumber, updateProfile, signOut, deleteAccount: deleteOnServer } = useOnboarding();
  const { seats, disconnectAll } = useMonitor();
  const factoryReset = useFactoryReset();
  const t = useStrings();
  const a = t.account;
  const [name, setName] = useState(account?.name ?? '');
  const nameEdited = name.trim() !== (account?.name ?? '');

  // Monitoring stops while logged out, so the login screen isn't hiding a live seat.
  // Logging out stops the alerts, so it asks first.
  const logOut = () =>
    Alert.alert(a.logOutTitle, a.logOutBody(seats.length ? seatsPhrase(seats.map((s) => s.childName)) : t.signIn.yourSeat), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: a.logOut,
        style: 'destructive',
        onPress: () => {
          disconnectAll();
          void signOut();
        },
      },
    ]);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Profile changes are saved on the account server, which can say no. */
  const save = (changes: Parameters<typeof updateProfile>[0]) => {
    setProfileError(null);
    updateProfile(changes).catch((e) => setProfileError(accountErrorMessage(e)));
  };

  // Deleted on the account server first, then everything on the phone.
  const deleteAccount = () =>
    Alert.alert(a.deleteTitle, a.deleteBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: a.delete,
        style: 'destructive',
        onPress: () =>
          void deleteOnServer()
            .then(() => factoryReset())
            .catch((e) => setError(accountErrorMessage(e))),
      },
    ]);

  const initial = (account?.name || '?')[0].toUpperCase();
  const number = phoneNumber ?? account?.phoneNumber;

  return (
    <View style={styles.screen}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero} accessible accessibilityLabel={`${account?.name || a.you}. ${number ? formatPhoneNumber(number) : ''}`}>
          <View style={styles.avatar}>
            <Text style={styles.initial}>{initial}</Text>
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroName}>{(account && describeAccount(account)) || a.you}</Text>
            {number ? <Text style={styles.heroDetail}>{formatPhoneNumber(number)}</Text> : null}
            {account?.createdAt ? (
              <Text style={styles.heroDetail}>{a.since(formatMonthYear(account.createdAt))}</Text>
            ) : null}
          </View>
        </View>

        <SectionTitle>{a.aboutYou}</SectionTitle>
        <Section>
          <TextField
            label={t.common.yourFirstName}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="givenName"
            maxLength={MAX_PROFILE_NAME_LENGTH}
            returnKeyType="done"
            hint={a.nameHint}
          />
          {nameEdited ? (
            <Button compact icon="checkmark" title={t.common.saveName} onPress={() => save({ name: name.trim() })} />
          ) : null}
          <OptionsField label={t.common.relationship}>
            {RELATIONSHIPS.map((r) => (
              <Button
                key={r}
                compact
                variant="secondary"
                title={relationshipLabel(r)}
                selected={account?.relationship === r}
                onPress={() => save({ relationship: account?.relationship === r ? null : r })}
              />
            ))}
          </OptionsField>
          {profileError ? <FieldError>{profileError}</FieldError> : null}
        </Section>

        <SectionTitle>{a.phoneNumber}</SectionTitle>
        <Section>
          <Text style={styles.value}>{number ? formatPhoneNumber(number) : a.noneYet}</Text>
          <Button
            variant="secondary"
            icon="phone.fill"
            title={a.changeNumber}
            onPress={() => router.push('/account/phone')}
          />
          <Hint>{a.changeNumberHint}</Hint>
        </Section>

        <SectionTitle>{a.yourData}</SectionTitle>
        <Section>
          <CardTitle icon="server.rack">{a.whereKept}</CardTitle>
          <Hint>{a.whereKeptHint(ownSeats(seats).length)}</Hint>
        </Section>

        <View style={styles.actions}>
          <Button variant="secondary" icon="rectangle.portrait.and.arrow.right" title={a.logOut} onPress={logOut} />
          <Hint>{a.logOutHint}</Hint>
          <Button variant="danger" icon="trash.fill" title={a.deleteAccount} onPress={deleteAccount} />
          {error ? <FieldError>{error}</FieldError> : null}
        </View>
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACE, gap: 10, paddingBottom: 48 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.highlight,
  },
  initial: { fontSize: 32, fontWeight: '600', color: colors.text },
  heroText: { flex: 1, gap: 2 },
  heroName: { ...textStyles.title, color: colors.text },
  heroDetail: { ...textStyles.subhead, color: colors.secondary },
  value: { fontSize: 20, lineHeight: 25, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  actions: { gap: 10, marginTop: 24 },
});
