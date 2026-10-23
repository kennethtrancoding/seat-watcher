import Constants from 'expo-constants';
import { Linking } from 'react-native';

const configured = Constants.expoConfig?.extra?.supportPhoneNumber;

/**
 * The number "Call for help" dials when setup can't find the seat. Set it in
 * app.json › expo.extra.supportPhoneNumber; while it's empty, the button is hidden.
 */
export const SUPPORT_PHONE_NUMBER: string | null =
  typeof configured === 'string' && configured.trim() ? configured.trim() : null;

export function callSupport(): void {
  if (SUPPORT_PHONE_NUMBER) void Linking.openURL(`tel:${SUPPORT_PHONE_NUMBER}`).catch(() => {});
}
