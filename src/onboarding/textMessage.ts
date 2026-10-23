import { loadIfNative } from '../native/optionalModule';

type SMSModule = typeof import('expo-sms');

const SMS = loadIfNative(
  'ExpoSMS',
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require('expo-sms') as SMSModule,
);

/**
 * Opens Messages with `message` already typed, for the person to pick who it
 * goes to and tap send. Resolves to whether they sent it, or to null when this
 * phone can't text from the app: the Simulator, an iPad without Messages, or a
 * development build made before expo-sms was added.
 */
export async function textMessage(message: string): Promise<'sent' | 'cancelled' | null> {
  if (!SMS || !(await SMS.isAvailableAsync())) return null;
  const { result } = await SMS.sendSMSAsync([], message);
  // Android can't tell; count it as sent rather than cancel an invite that went out.
  return result === 'cancelled' ? 'cancelled' : 'sent';
}
