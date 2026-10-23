import { useOnboarding } from '../../onboarding/OnboardingProvider';
import { PhoneSignIn } from '../../onboarding/PhoneSignIn';

/**
 * Log in from the title card, for someone who already has an account. Not a
 * step of its own: afterwards setup ends, or carries on after its log-in step
 * on the 'self' path (see finishLogIn).
 */
export default function TitleCardLogInScreen() {
  const { finishLogIn } = useOnboarding();
  return <PhoneSignIn onSignedIn={() => void finishLogIn()} />;
}
