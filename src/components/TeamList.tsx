import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { relationshipLabel } from '../account/account';
import { accountErrorMessage } from '../account/server';
import { formatDay, type Member, type TeamInviteView, type TeamView } from '../account/team';
import { useTeam } from '../account/TeamProvider';
import { useStrings } from '../i18n/useStrings';
import { useOnboarding } from '../onboarding/OnboardingProvider';
import { formatPhoneNumber } from '../onboarding/phone';
import { ChildAvatar } from './ChildPhoto';
import { Button, FieldError, Icon, Mark, Section, Text, colors, textStyles } from './ui';

/**
 * Everyone on a team, then the invites still out. On your own team you can
 * remove helpers and cancel invites; on a team you help you only see who's on
 * it. `team` null is your own team before your first invite: just you.
 */
export function TeamList({ team }: { team: TeamView | null }) {
  const { loaded, removeMember, cancelInvite } = useTeam();
  const { account } = useOnboarding();
  const strings = useStrings();
  const t = strings.team;
  const [error, setError] = useState<string | null>(null);

  if (!loaded || !account) return null;
  // Only your own team's people are yours to remove. The server says no to the rest anyway.
  const canManage = !team || team.role === 'owner';

  const members: Member[] = team?.members ?? [
    {
      id: 'you',
      accountId: account.id,
      role: 'owner',
      name: account.name,
      relationship: account.relationship,
      phoneNumber: account.phoneNumber,
      joinedAt: account.createdAt,
      pretend: false,
    },
  ];
  const nameOf = (m: Member) => m.name || (m.phoneNumber ? formatPhoneNumber(m.phoneNumber) : t.someone);

  const run = (action: () => Promise<void>) => {
    setError(null);
    action().catch((e) => setError(accountErrorMessage(e)));
  };

  const remove = (member: Member) =>
    Alert.alert(t.removeTitle(nameOf(member)), t.removeBody, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: strings.common.remove, style: 'destructive', onPress: () => run(() => removeMember(member.id)) },
    ]);


  return (
    <View style={styles.list}>
      {members.map((m) => {
        const you = m.accountId === account.id;
        const detail = [
          m.relationship ? relationshipLabel(m.relationship) : '',
          m.role === 'owner' ? t.owner : t.joined(formatDay(m.joinedAt)),
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <Section key={m.id} style={styles.row}>
            <ChildAvatar uri="" name={m.name} size={44} />
            <View style={styles.text}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{nameOf(m)}</Text>
                {you ? <Mark>{t.you}</Mark> : null}
                {m.pretend ? <Mark>{t.pretend}</Mark> : null}
              </View>
              <Text style={styles.detail}>{detail}</Text>
              {!you && m.name && m.phoneNumber ? (
                <Text style={styles.detail}>{formatPhoneNumber(m.phoneNumber)}</Text>
              ) : null}
            </View>
            {canManage && m.role === 'helper' ? (
              <Button
                compact
                variant="secondary"
                title={strings.common.remove}
                accessibilityHint={t.removeHint(nameOf(m))}
                onPress={() => remove(m)}
              />
            ) : null}
          </Section>
        );
      })}
      {(team?.invites ?? []).map((invite: TeamInviteView) => {
        const expired = invite.status === 'expired';
        return (
          <Section key={invite.code} style={styles.row}>
            <View style={styles.inviteIcon}>
              <Icon name={expired ? 'envelope.badge' : 'envelope.fill'} size={22} />
            </View>
            <View style={styles.text}>
              <Text style={styles.name}>{t.inviteSent(formatDay(invite.createdAt))}</Text>
              <Text style={styles.detail}>{expired ? t.expired : t.waiting(formatDay(invite.expiresAt))}</Text>
            </View>
            {canManage ? (
              <Button
                compact
                variant="secondary"
                title={expired ? strings.common.remove : t.cancelInvite}
                onPress={() => run(() => cancelInvite(invite.code))}
              />
            ) : null}
          </Section>
        );
      })}
      {error ? <FieldError>{error}</FieldError> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16 },
  text: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  name: { ...textStyles.headline, color: colors.text },
  detail: { ...textStyles.subhead, color: colors.secondary },
  inviteIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
