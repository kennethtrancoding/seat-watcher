import { ScreenScrollView } from '../components/ScreenScrollView';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { accountErrorMessage } from '../account/server';
import { teamOwner, type TeamView } from '../account/team';
import { useTeam } from '../account/TeamProvider';
import { Hint } from '../components/fields';
import { InviteButton } from '../components/InviteButton';
import { TeamList } from '../components/TeamList';
import { Button, FieldError, SPACE, SectionTitle, Text, colors, textStyles } from '../components/ui';
import { useStrings } from '../i18n/useStrings';
import { useMonitor } from '../monitor/MonitorProvider';
import { ownSeats, seatsPhrase } from '../seats/seats';

/**
 * Your teams: your own, the people who help watch your seats, where you
 * invite and remove people; then each team you help, which you can see and
 * leave. Someone who only helps (no seats of their own yet) sees those first.
 */
export default function TeamScreen() {
  const { ownTeam, helping, loaded, leave, pretend } = useTeam();
  const { seats } = useMonitor();
  const strings = useStrings();
  const t = strings.team;
  const [error, setError] = useState<string | null>(null);

  const mine = ownSeats(seats);
  const ownerName = (team: TeamView) => teamOwner(team)?.name ?? '';

  const confirmLeave = (team: TeamView) =>
    Alert.alert(t.leaveTitle(ownerName(team)), t.leaveBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: t.leaveConfirm,
        style: 'destructive',
        onPress: () => {
          setError(null);
          leave(team.id).catch((e) => setError(accountErrorMessage(e)));
        },
      },
    ]);

  if (!loaded) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={colors.text} style={styles.spinner} />
      </View>
    );
  }

  const yours = (
    <View style={styles.group}>
      {helping.length ? <SectionTitle>{t.title}</SectionTitle> : null}
      <Text style={styles.intro}>
        {mine.length ? t.ownerIntro(seatsPhrase(mine.map((s) => s.childName))) : t.noSeatsIntro}
      </Text>
      {/* With no seats of your own yet, there's no one on it to list but you. */}
      {ownTeam || mine.length ? <TeamList team={ownTeam} /> : null}
      <InviteButton />
      {pretend ? <Hint>{t.pretendNote}</Hint> : null}
    </View>
  );

  const helped = helping.length ? (
    <View style={styles.group}>
      <SectionTitle>{t.helping}</SectionTitle>
      {helping.map((team) => {
        const owner = ownerName(team);
        return (
          <View key={team.id} style={styles.group}>
            <Text style={styles.teamName}>{t.teamOf(owner)}</Text>
            <Text style={styles.intro}>
              {t.helperIntro(owner, seatsPhrase(team.seats.length ? team.seats.map((s) => s.childName) : ['']))}
            </Text>
            <TeamList team={team} />
            <Button
              variant="secondary"
              icon="rectangle.portrait.and.arrow.right"
              title={t.leave(owner)}
              onPress={() => confirmLeave(team)}
            />
          </View>
        );
      })}
    </View>
  ) : null;

  // Your own team comes first once you have seats of your own (or a team) to share.
  const ownFirst = mine.length > 0 || ownTeam !== null || !helping.length;

  return (
    <View style={styles.screen}>
      <ScreenScrollView contentContainerStyle={styles.content}>
        {ownFirst ? yours : helped}
        {ownFirst ? helped : yours}
        {error ? <FieldError>{error}</FieldError> : null}
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACE, gap: 28, paddingBottom: 48 },
  group: { gap: 14 },
  intro: { fontSize: 17, lineHeight: 24, color: colors.text },
  teamName: { ...textStyles.headline, color: colors.text },
  spinner: { marginVertical: 24 },
});
