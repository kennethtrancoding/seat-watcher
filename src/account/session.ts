/**
 * What logging in should do on this phone. The phone holds one account's car
 * seats and settings at a time; the account server keeps a copy for every
 * account (AccountData), so switching accounts or logging back in never loses
 * them. Pure: no React or native imports.
 */

import { ownSeats, type Seat } from '../seats/seats';
import type { Account } from './account';
import type { AccountData } from './server';

/**
 * - 'logIn': the number is the phone's account, or the phone has nothing on it yet.
 * - 'switch': the phone has `from`'s seats on it. Switching saves theirs with
 *   their account and brings in the new account's.
 */
export type LoginPlan = { kind: 'logIn' } | { kind: 'switch'; from: Account };

/**
 * `phoneAccount` is the account whose seats and settings are on the phone
 * (kept while logged out), and `phoneHasData` whether there's anything of
 * theirs to keep: finished setup, or a seat.
 */
export function planLogin(phoneAccount: Account | null, phoneNumber: string, phoneHasData: boolean): LoginPlan {
  if (!phoneAccount || phoneAccount.phoneNumber === phoneNumber || !phoneHasData) return { kind: 'logIn' };
  return { kind: 'switch', from: phoneAccount };
}

/**
 * In setup, with no seats of your own on the phone yet: offer to bring back
 * what's saved with the account. Seats shared with you don't count; they
 * follow the teams you help either way.
 */
export function canRestore(phoneSeats: readonly Seat[], saved: AccountData | null): saved is AccountData {
  return ownSeats(phoneSeats).length === 0 && !!saved && saved.seats.length > 0;
}
