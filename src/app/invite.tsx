import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { accountErrorMessage } from '../account/server';
import { Button, Notice } from '../components/ui';
import { useStrings } from '../i18n/useStrings';
import { inviteFromParams, inviteUrl } from '../onboarding/invite';
import { useOnboarding } from '../onboarding/OnboardingProvider';
import { OnboardingScreen } from '../onboarding/OnboardingScreen';
import { PhoneSignIn } from '../onboarding/PhoneSignIn';
import { seatsPhrase } from '../seats/seats';

/**
 * Where invite links open (carseatmonitor://invite?code=K7M2QX&child=Emma&from=Kenneth),
 * whatever state the phone is in. It's outside the root layout's protected
 * groups, so it always exists:
 * - during setup, it hands over to setup's invite step;
 * - set up and logged in, it offers to join the team and adds its seats;
 * - logged out, it logs them in first, right here.
 */
export default function InviteLinkScreen() {
  const { code, child, from } = useLocalSearchParams<{ code?: string; child?: string | string[]; from?: string }>();
  const { completed, phoneNumber, joinInvite } = useOnboarding();
  const strings = useStrings();
  const t = strings.inviteLink;
  const [phase, setPhase] = useState<'asking' | 'joining' | 'joined'>('asking');
  const [error, setError] = useState<string | null>(null);
  const invite = inviteFromParams(code, child, from);

  // Not set up yet: the invite is how setup starts.
  if (!completed) {
    return <Redirect href={invite ? inviteUrl(invite, '/onboarding/invite') : '/onboarding/invite'} />;
  }

  const home = () => router.replace('/');

  if (!invite) {
    return (
      <OnboardingScreen
        icon="envelope.badge"
        title={t.brokenTitle}
        body={t.brokenBody}
        actions={<Button title={t.toApp} onPress={home} />}
      />
    );
  }

  // Once logged in, this page asks to join. Switching to an account that's
  // new goes through setup, which the redirect above hands the invite to.
  if (!phoneNumber) {
    return <PhoneSignIn mode="login" intro={{ title: t.logInTitle(invite.from), body: t.logInBody }} />;
  }

  const seatsText = seatsPhrase(invite.childNames);

  if (phase === 'joined') {
    return (
      <OnboardingScreen
        icon="checkmark.seal.fill"
        title={strings.onboarding.invite.acceptTitle}
        body={t.joinedBody(seatsText)}
        actions={<Button title={t.done} onPress={home} />}
      />
    );
  }

  const accept = async () => {
    setPhase('joining');
    setError(null);
    try {
      await joinInvite(invite);
      setPhase('joined');
    } catch (e) {
      setError(accountErrorMessage(e));
      setPhase('asking');
    }
  };

  return (
    <OnboardingScreen
      icon="envelope.open.fill"
      title={t.joinTitle(invite.from)}
      body={t.joinBody(invite.from, seatsText, invite.childNames.length)}
      actions={
        <>
          <Button title={t.join} disabled={phase === 'joining'} onPress={() => void accept()} />
          <Button title={t.notNow} variant="secondary" onPress={home} />
        </>
      }
    >
      {error ? <Notice tone="warning">{error}</Notice> : null}
    </OnboardingScreen>
  );
}
