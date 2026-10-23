import { router } from 'expo-router';

import { stepHref, stepsFor, type OnboardingPath } from '../onboarding/flow';
import { useOnboarding } from '../onboarding/OnboardingProvider';
import { TitleCard } from '../onboarding/TitleCard';

/**
 * Where logging out (Settings › Account) lands: the title card again. Log in
 * opens the login screen (src/app/login.tsx), which welcomes them back with
 * their number filled in. The two ways in start setup over, as Developer ›
 * Run setup again does: the account and the seats stay on the phone.
 */
export default function LoggedOutScreen() {
  const { restart, choosePath } = useOnboarding();
  const start = async (path: OnboardingPath) => {
    // The root layout swaps this screen for setup's title card first.
    await restart();
    choosePath(path);
    router.push(stepHref(stepsFor(path)[0]));
  };
  return <TitleCard onStart={(path) => void start(path)} onLogIn={() => router.push('/login')} />;
}
