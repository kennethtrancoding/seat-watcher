import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type AuthError } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { strings } from '../i18n/i18n';
import { PhoneAuthError, WRONG_CODE_ERRORS, authErrorMessage, type PhoneAuth } from './auth';

const toPhoneAuthError = (error: AuthError) =>
  new PhoneAuthError(authErrorMessage(error.code) ?? strings().signIn.errors.general);

/**
 * Real log-in codes by text, through Supabase Auth's phone sign-in. Supabase
 * sends the text with the SMS provider set up in its dashboard (Twilio,
 * MessageBird, Vonage or TextLocal) and checks the code.
 */
export function createSupabasePhoneAuth(url: string, publishableKey: string): PhoneAuth {
  const supabase = createClient(url, publishableKey, {
    auth: {
      // AsyncStorage is already in the app's native build (Expo's guide uses expo-sqlite instead).
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // A phone app has no web address for a session to arrive in.
      detectSessionInUrl: false,
    },
  });

  // Supabase's advice for mobile: refresh the session only while the app is on screen.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });

  return {
    async sendCode(phoneNumber) {
      const { error } = await supabase.auth.signInWithOtp({ phone: phoneNumber });
      if (error) throw toPhoneAuthError(error);
    },
    async verifyCode(phoneNumber, code) {
      const { error } = await supabase.auth.verifyOtp({ phone: phoneNumber, token: code, type: 'sms' });
      if (!error) return true;
      if (error.code && WRONG_CODE_ERRORS.includes(error.code)) return false;
      throw toPhoneAuthError(error);
    },
    async signOut() {
      // Signing out locally never fails in a way worth showing.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    },
  };
}
