/**
 * Logging in with a phone number and a texted code. Texting a code needs an
 * SMS service; supabaseAuth.ts uses Supabase Auth for that once it's set up
 * (see docs/onboarding.md › Real text messages). Until then the app uses
 * `demoPhoneAuth`, which sends nothing. phoneAuth.ts picks between them.
 */

import { strings } from '../i18n/i18n';

export interface PhoneAuth {
  /** Texts a log-in code to the number (E.164). Throws PhoneAuthError with a message to show. */
  sendCode(phoneNumber: string): Promise<void>;
  /** Resolves true if `code` is the one sent to the number, false if it's wrong or expired. */
  verifyCode(phoneNumber: string, code: string): Promise<boolean>;
  /** Ends the provider's session, if it keeps one. */
  signOut?(): Promise<void>;
  /** Shown under the code field when the code doesn't arrive by text. */
  readonly notice?: string;
}

/** A log-in problem whose message is written for the person holding the phone. */
export class PhoneAuthError extends Error {}

export const CODE_LENGTH = 6;

/** Sends nothing and accepts any 6-digit code. */
export const demoPhoneAuth: PhoneAuth = {
  async sendCode() {},
  async verifyCode(_phoneNumber, code) {
    return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code);
  },
  get notice() {
    return strings().signIn.demoNotice;
  },
};

/** Supabase Auth error codes that mean the code was wrong or too old, rather than that something broke. */
export const WRONG_CODE_ERRORS = ['otp_expired', 'invalid_credentials'];

/**
 * What to tell the user for a Supabase Auth error code, or null when the code
 * isn't one we know (show a general "check you're online" message instead).
 */
export function authErrorMessage(code: string | undefined): string | null {
  const t = strings().signIn.errors;
  switch (code) {
    case 'over_sms_send_rate_limit':
    case 'over_request_rate_limit':
      return t.tooSoon;
    case 'sms_send_failed':
      return t.cantText;
    case 'validation_failed':
      return t.badNumber;
    case 'phone_provider_disabled':
    case 'provider_disabled':
    case 'otp_disabled':
      return t.notSwitchedOn;
    case 'signup_disabled':
      return t.noNewAccounts;
    case 'captcha_failed':
      return t.notConfirmed;
    default:
      return null;
  }
}
