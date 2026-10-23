import { router } from 'expo-router';

import { PhoneSignIn } from '../../onboarding/PhoneSignIn';

/** Account › Change number: verifies the new number with a texted code, then uses it. */
export default function ChangeNumberScreen() {
  return <PhoneSignIn mode="change" onSignedIn={() => router.back()} />;
}
