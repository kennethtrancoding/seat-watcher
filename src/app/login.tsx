import { PhoneSignIn } from '../onboarding/PhoneSignIn';

/**
 * Shown after logging out (Settings › Account), once setup is done. Logging
 * back in brings back the main screen; the root layout makes the switch.
 */
export default function LoginScreen() {
  return <PhoneSignIn mode="login" />;
}
