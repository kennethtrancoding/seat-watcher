/**
 * The account server: accounts, teams and invites. Today the app uses a
 * pretend one that lives on the phone (fakeAccountServer.ts); a real one, on
 * Supabase say, would implement this same interface. See docs/onboarding.md › Accounts.
 *
 * Every method checks who's asking: `accountId` stands in for the session a
 * real server would read from the request. Pure: no React or native imports.
 */

import { strings } from '../i18n/i18n';
import type { Invite } from '../onboarding/invite';
import type { Seat } from '../seats/seats';
import type { Settings } from '../settings/settings';
import type { Account } from './account';
import type { TeamInvite, TeamSeat, TeamView } from './team';
import type { AlertDelivery, AlertSeat, TeamAlert, TeamAlertKind } from './teamAlerts';

export type AccountErrorCode =
  | 'notFound'
  | 'numberTaken'
  | 'notAllowed'
  | 'teamFull'
  | 'noSeats'
  | 'inviteNotFound'
  | 'inviteUsed'
  | 'inviteExpired'
  | 'inviteCancelled'
  | 'ownInvite';

/** A refusal from the server, with a code the app can explain (accountErrorMessage). */
export class AccountError extends Error {
  constructor(readonly code: AccountErrorCode) {
    super(code);
  }
}

/** What to tell the person, for an AccountError or anything else that went wrong. */
export function accountErrorMessage(error: unknown): string {
  const t = strings().team.errors;
  return error instanceof AccountError ? t[error.code] : t.general;
}

export type ProfileChanges = Partial<Pick<Account, 'name' | 'relationship'>>;

/**
 * What's saved with an account so it follows them: their car seats and
 * settings. Logging in brings it back, whether on this phone after someone
 * else used it, after a factory reset, or (with a real server) on a new phone.
 */
export interface AccountData {
  seats: Seat[];
  settings: Settings;
  /** When it was saved (ms since 1970). */
  savedAt: number;
}

export interface AccountServer {
  /** The account for a number that PhoneAuth just verified, made the first time. */
  signIn(phoneNumber: string): Promise<Account>;
  /** Null if there's no such account. */
  getAccount(accountId: string): Promise<Account | null>;
  updateProfile(accountId: string, changes: ProfileChanges): Promise<Account>;
  /** Fails with 'numberTaken' if another account has the number. */
  changeNumber(accountId: string, phoneNumber: string): Promise<Account>;
  /** Deletes the account and what's saved with it. Their own team goes with it, and they leave the teams they help. */
  deleteAccount(accountId: string): Promise<void>;

  /** The seats and settings saved with the account, or null if nothing's been saved yet. */
  loadAccountData(accountId: string): Promise<AccountData | null>;
  /**
   * Saves the seats and settings with the account, replacing what was there.
   * The account's own seats among them (not the ones shared with it) become
   * what its team watches. Doesn't notify subscribers; a real server would
   * push the team's new seats to its helpers.
   */
  saveAccountData(accountId: string, data: Pick<AccountData, 'seats' | 'settings'>): Promise<void>;

  /** The teams this account is on: its own first (once it has one), then the ones it helps, in the order it joined. */
  getTeams(accountId: string): Promise<TeamView[]>;
  /**
   * A new invite to the caller's own team, making the team if they don't
   * have one yet. `seats` are the caller's own seats, all named; the team
   * watches them. Seats shared with the caller can't be passed on.
   */
  createInvite(accountId: string, seats: TeamSeat[]): Promise<TeamInvite>;
  /** On the caller's own team. Also clears away an expired invite. */
  cancelInvite(accountId: string, code: string): Promise<void>;
  /** Joins the team the invite is from, as a helper. Anyone can help on any number of teams, besides their own. */
  acceptInvite(accountId: string, invite: Invite): Promise<TeamView>;
  /** Takes a helper off the caller's own team. */
  removeMember(accountId: string, memberId: string): Promise<void>;
  /** Leaves a team the caller helps. Its seats are no longer shared with them. */
  leaveTeam(accountId: string, teamId: string): Promise<void>;

  /**
   * The caller's phone has alerted about `seat`, and the rest of the seat's
   * team should hear (see teamAlerts.ts): no one is left with it
   * ('leftAlone': the owner now, everyone else after the owner's
   * Settings.backupAfterMinutes) or it's too hot ('tooHot': everyone now).
   * Your own seat's team is your own; a shared seat's is the team that shares
   * it, which you must still be on. If another phone on the team already
   * raised the same alert, the caller joins it, so no one is told twice.
   * Resolves to the alert's ID, or null if it's your own seat and you have no
   * team yet, so there's no one else to tell.
   */
  raiseAlert(accountId: string, kind: TeamAlertKind, seat: AlertSeat): Promise<string | null>;
  /**
   * The caller's phone no longer sees the alert: someone's back with the seat,
   * it cooled down, or the child is out. It ends once no phone that raised it
   * still does, and then no one else needs telling.
   */
  endAlert(accountId: string, alertId: string): Promise<void>;

  /** Called after anything on the server changes. A real server would push this over a realtime channel. */
  subscribe(listener: () => void): () => void;

  /** Tools for the pretend server, on the Developer screen. A real server has none. */
  readonly pretend?: {
    /** Made-up helpers accept every invite to your own team still waiting. Resolves to how many. */
    acceptWaitingInvites(accountId: string): Promise<number>;
    /** Forgets everything except this account, which keeps its profile and saved seats but loses its teams. */
    reset(keepAccountId: string | null): Promise<void>;
    /**
     * The latest alerts on every team you're on, newest first, with who has
     * been told and who will be. A real server would send these as push
     * notifications; this one can only show them.
     */
    alertLog(accountId: string): Promise<{ alert: TeamAlert; deliveries: AlertDelivery[] }[]>;
  };
}
