import { useOnboarding } from '../../onboarding/OnboardingProvider';
import { PhoneSignIn } from '../../onboarding/PhoneSignIn';

/** The setup step: phone number plus a texted code. */
export default function SignInScreen() {
  const { goNext } = useOnboarding();
  return <PhoneSignIn step="sign-in" onSignedIn={() => goNext('sign-in')} />;
}
