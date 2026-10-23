import { AccessibilityInfo } from 'react-native';

import { speechLanguage } from '../i18n/i18n';
import { loadIfNative } from '../native/optionalModule';

type SpeechModule = typeof import('expo-speech');

let speech: SpeechModule | null | undefined;

function getSpeech(): SpeechModule | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  speech ??= loadIfNative('ExpoSpeech', () => require('expo-speech') as SpeechModule);
  return speech;
}

/**
 * Reads text aloud in a voice for the app's language, replacing anything still
 * being read. Does nothing while VoiceOver is on.
 */
export async function speak(text: string): Promise<void> {
  const s = getSpeech();
  if (!s || !text) return;
  // VoiceOver already reads the screen; two voices at once would be unusable.
  if (await AccessibilityInfo.isScreenReaderEnabled()) return;
  await s.stop();
  // Its own audio session, so the Silent switch doesn't mute it the way it
  // mutes the app's own sounds.
  s.speak(text.slice(0, s.maxSpeechInputLength), {
    useApplicationAudioSession: false,
    language: speechLanguage(),
  });
}

export function stopSpeaking(): void {
  void getSpeech()?.stop();
}
