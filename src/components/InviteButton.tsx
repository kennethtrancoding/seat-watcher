import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { accountErrorMessage } from '../account/server';
import { MAX_HELPERS, teamCounts } from '../account/team';
import { useTeam } from '../account/TeamProvider';
import { useStrings } from '../i18n/useStrings';
import { useMonitor } from '../monitor/MonitorProvider';
import { inviteMessage } from '../onboarding/invite';
import { useOnboarding } from '../onboarding/OnboardingProvider';
import { textMessage } from '../onboarding/textMessage';
import { ownSeats, seatsPhrase } from '../seats/seats';
import { Hint } from './fields';
import { Button, FieldError } from './ui';

/**
 * "Invite someone to help": makes an invite on the account server and opens
 * Messages with its link already typed, for the parent to pick who it goes
 * to. Where Messages isn't available (the Simulator, an older build) it opens
 * the share sheet instead. Each tap is a new invite, for one person; backing
 * out without sending cancels it. Invites are always to your own team, for
 * your own seats: the ones shared with you are their owner's to share.
 */
export function InviteButton() {
  const { seats } = useMonitor();
  const { account } = useOnboarding();
  const { ownTeam, loaded, createInvite, cancelInvite } = useTeam();
  const t = useStrings().team;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loaded) return null;

  // The link should carry what's actually set up: every seat of your own, named.
  const mine = ownSeats(seats);
  const childNames = mine.map((s) => s.childName);
  const named = mine.length > 0 && childNames.every(Boolean);
  const { helpers, waiting } = teamCounts(ownTeam);
  const full = helpers + waiting >= MAX_HELPERS;

  const invite = async () => {
    setBusy(true);
    setError(null);
    let code: string | null = null;
    try {
      code = (await createInvite(mine.map((s) => ({ id: s.id, childName: s.childName })))).code;
      const message = inviteMessage({ code, childNames, from: account?.name ?? '' });
      const texted = await textMessage(message);
      const sent = texted ? texted === 'sent' : (await Share.share({ message })).action !== Share.dismissedAction;
      if (!sent) await cancelInvite(code);
    } catch (e) {
      if (code) await cancelInvite(code).catch(() => {});
      setError(accountErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.invite}>
      <Button
        variant="secondary"
        icon="message.fill"
        title={t.invite}
        disabled={busy || !named || full}
        onPress={() => void invite()}
      />
      <Hint>
        {!mine.length
          ? t.addSeatFirst
          : !named
            ? t.nameSeatsFirst
            : full
              ? t.full(MAX_HELPERS)
              : t.inviteHint(seatsPhrase(childNames))}
      </Hint>
      {error ? <FieldError>{error}</FieldError> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  invite: { gap: 8 },
});
