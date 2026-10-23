import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Notice, TextField } from '../../components/ui';
import { useStrings } from '../../i18n/useStrings';
import { inviteFromParams, parseInvite, type Invite } from '../../onboarding/invite';
import { seatsPhrase } from '../../seats/seats';
import { useOnboarding } from '../../onboarding/OnboardingProvider';
import { OnboardingScreen } from '../../onboarding/OnboardingScreen';

/**
 * Reached by opening an invite link (carseatmonitor://onboarding/invite?code=K7M2QX&child=Emma&from=Kenneth),
 * or from "Someone sent me an invite", in which case the link can be pasted here.
 * Accepting remembers the invite; once they've logged in, the team is joined
 * and a seat is added for each child (OnboardingProvider.joinInvite). This
 * phone pairs with the seat hardware itself, from the home screen.
 */
export default function InviteScreen() {
  const { code, child, from } = useLocalSearchParams<{ code?: string; child?: string | string[]; from?: string }>();
  const { choosePath, goNext, acceptInvite } = useOnboarding();
  const strings = useStrings();
  const t = strings.onboarding.invite;
  const [invite, setInvite] = useState<Invite | null>(() => inviteFromParams(code, child, from));
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState<string | undefined>();

  // Opening the link skips the "ways in" screen.
  useEffect(() => choosePath('invite'), [choosePath]);

  const accept = (accepted: Invite) => {
    acceptInvite(accepted);
    goNext('invite');
  };

  const readPasted = () => {
    const found = parseInvite(pasted);
    if (found) {
      setError(undefined);
      setInvite(found);
    } else {
      setError(t.notAnInvite);
    }
  };

  if (invite) {
    return (
      <OnboardingScreen
        step="invite"
        icon="envelope.open.fill"
        title={t.acceptTitle}
        body={t.acceptBody(invite.from, seatsPhrase(invite.childNames))}
        actions={<Button title={t.accept} onPress={() => accept(invite)} />}
      />
    );
  }

  return (
    <OnboardingScreen
      step="invite"
      icon="envelope.fill"
      title={t.findTitle}
      body={t.findBody}
      actions={<Button title={strings.common.continue} disabled={!pasted.trim()} onPress={readPasted} />}
    >
      <TextField
        label={t.message}
        value={pasted}
        onChangeText={setPasted}
        placeholder={t.paste}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        error={error}
      />
      <Notice tone="info">
        {t.noInvite}
      </Notice>
    </OnboardingScreen>
  );
}
