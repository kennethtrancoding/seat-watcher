import { Button } from '../../components/ui';
import { useStrings } from '../../i18n/useStrings';
import { useOnboarding } from '../../onboarding/OnboardingProvider';
import { OnboardingScreen } from '../../onboarding/OnboardingScreen';

export default function WelcomeScreen() {
  const { goNext } = useOnboarding();
  const t = useStrings().onboarding.welcome;
  return (
    <OnboardingScreen
      step="welcome"
      icon="hand.wave.fill"
      title={t.title}
      body={t.body}
      actions={<Button title={t.start} onPress={() => goNext('welcome')} />}
    />
  );
}
