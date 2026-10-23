import { Redirect, router } from 'expo-router';

import { stepHref, stepsFor, type OnboardingPath } from '../../onboarding/flow';
import { useOnboarding } from '../../onboarding/OnboardingProvider';
import { TitleCard } from '../../onboarding/TitleCard';

/** The title card, before the main flow. */
export default function WaysInScreen() {
  const { choosePath, phoneNumber } = useOnboarding();
  const start = (path: OnboardingPath) => {
    choosePath(path);
    router.push(stepHref(stepsFor(path)[0]));
  };
  // The parent's path: what's left of setup afterwards, if anything, and an
  // invite opened earlier isn't joined.
  const logIn = () => {
    choosePath('self');
    router.push('/onboarding/login');
  };
  // A new account verified on the login screen continues at its profile step.
  if (phoneNumber) return <Redirect href="/onboarding/sign-in" />;
  return <TitleCard onStart={start} onLogIn={logIn} />;
}
