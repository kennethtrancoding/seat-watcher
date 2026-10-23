import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import type { Account } from '../account/account';
import { accountServer } from '../account/accountServer';
import type { AccountData, ProfileChanges } from '../account/server';
import { canRestore, planLogin, type LoginPlan } from '../account/session';
import { sharingTeams } from '../account/team';
import { useMonitor } from '../monitor/MonitorProvider';
import type { Seat } from '../seats/seats';
import { DEFAULT_SETTINGS, type Settings } from '../settings/settings';
import { NEW_ONBOARDING, nextStep, stepHref, type OnboardingPath, type OnboardingRecord, type StepId } from './flow';
import type { Invite } from './invite';
import { phoneAuth } from './phoneAuth';
import { loadOnboarding, saveOnboarding } from './storage';

/** What logging in did. */
export interface LoginResult {
  account: Account;
  /** Why the team from the invite accepted in setup couldn't be joined, or null. */
  joinError: unknown;
  /** In setup, with nothing on the phone yet: what's saved with the account, to offer bringing back. */
  restorable: AccountData | null;
}

interface OnboardingContextValue extends OnboardingRecord {
  /** Which way in was chosen. Not saved: setup restarts from the beginning after a relaunch. */
  path: OnboardingPath;
  choosePath(path: OnboardingPath): void;
  /** Opens the screen after `current` on the chosen path. */
  goNext(current: StepId): void;
  /** Remembers the invite accepted in setup; its team is joined (and its seats added) at log-in. Not saved. */
  acceptInvite(invite: Invite): void;
  /** What logging in with this verified number would do on this phone. Check it before signIn. */
  planLogin(phoneNumber: string): LoginPlan;
  /**
   * Logs in with a number PhoneAuth just verified, when planLogin says 'logIn':
   * the account server finds (or makes) its account, the phone's seats and
   * settings are saved with it, an invite accepted in setup is joined, and
   * the seats the account's teams share with it come onto the phone.
   */
  signIn(phoneNumber: string): Promise<LoginResult>;
  /**
   * For planLogin's 'switch', straight after the code is checked (there's no
   * asking first): saves the phone's seats and settings with the account they
   * belong to, logs in with the new number and brings in what's saved with
   * that account, and the seats its teams share. From the login screen, an
   * account with seats goes straight to the main screen (`restored`); a new
   * one goes through setup. In setup, setup carries on either way.
   */
  switchAccount(phoneNumber: string): Promise<LoginResult & { restored: boolean }>;
  /**
   * Brings back what's saved with the account (LoginResult.restorable). Setup
   * carries on, with it filled in; resolves to why an invite accepted in
   * setup couldn't be joined, or null.
   */
  restore(saved: AccountData): Promise<unknown>;
  /** Turns down LoginResult.restorable: setup carries on, and what's set up replaces it. Resolves like restore. */
  skipRestore(): Promise<unknown>;
  /**
   * Joins the team an invite is from, as a helper, and brings its seats onto
   * this phone. They're shared, so only their owner can rename or remove them.
   */
  joinInvite(invite: Invite): Promise<void>;
  /** Account › Change number, for a verified number. Throws AccountError('numberTaken') if it's someone else's. */
  changeNumber(phoneNumber: string): Promise<void>;
  /** Saves the name and relationship, on the account server and in the copy on the phone. */
  updateProfile(changes: ProfileChanges): Promise<void>;
  /** Deletes the account on the account server. Erase the phone afterwards with useFactoryReset. */
  deleteAccount(): Promise<void>;
  /** Forgets the logged-in number but keeps the account. The root layout then shows the login screen. */
  signOut(): Promise<void>;
  /** Ends setup. The root layout then swaps the setup screens for the main screen. */
  complete(): Promise<void>;
  /**
   * Logging in from the title card (src/app/onboarding/login.tsx) is done. A
   * phone with seats that's allowed to send alerts has nothing left to set up,
   * so setup ends. Otherwise setup carries on after its log-in step, with
   * whatever came back from the account filled in.
   */
  finishLogIn(): Promise<void>;
  /** Starts setup over, logged out (Developer › Run setup again). The account stays. */
  restart(): Promise<void>;
  /** Forgets setup and the account on this phone (the factory reset). The account server keeps it. */
  eraseAccount(): Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [record, setRecord] = useState<OnboardingRecord | null>(null);
  // The latest record, for calls that finish after an await.
  const recordRef = useRef<OnboardingRecord | null>(null);
  const [path, setPath] = useState<OnboardingPath>('self');
  // goNext can run right after choosePath, before the state update renders.
  const pathRef = useRef(path);
  const pendingInvite = useRef<Invite | null>(null);
  // While bringing back saved seats is on offer, the phone's (empty) ones aren't saved over them.
  const holdSync = useRef(false);
  const {
    seats,
    settings,
    notificationsAllowed,
    replaceData,
    syncSharedSeats,
    setDataHandler,
    setUserName,
    setAutoConnect,
  } = useMonitor();
  // The phone's seats and settings, for calls that finish after an await.
  const latest = useRef({ seats, settings });
  useEffect(() => {
    latest.current = { seats, settings };
  });
  const userName = record?.account?.name ?? '';

  const update = useCallback(async (change: (current: OnboardingRecord) => OnboardingRecord) => {
    const next = change(recordRef.current ?? NEW_ONBOARDING);
    recordRef.current = next;
    setRecord(next);
    await saveOnboarding(next);
  }, []);

  /**
   * Saves seats and settings with an account: the phone's, unless they're
   * given. Failing is fine: the next change tries again.
   */
  const saveData = useCallback((accountId: string, data: { seats: readonly Seat[]; settings: Settings } = latest.current) => {
    return accountServer.saveAccountData(accountId, { seats: [...data.seats], settings: data.settings }).catch(() => {});
  }, []);

  /**
   * Brings the seats shared with the logged-in account in line with the
   * teams it helps: new ones added, renamed ones renamed, and the ones no
   * longer shared (after leaving a team, or being taken off it) removed. Not
   * while logged out, or while what's on the phone is being swapped or
   * offered back (holdSync). Failing is fine: the next change tries again.
   */
  const syncShared = useCallback(async () => {
    const loggedIn = () => (recordRef.current?.phoneNumber ? recordRef.current.account?.id : undefined);
    const accountId = loggedIn();
    if (!accountId || holdSync.current) return;
    try {
      const teams = await accountServer.getTeams(accountId);
      // Logged out, switched or started a swap meanwhile: these aren't the phone's teams any more.
      if (loggedIn() !== accountId || holdSync.current) return;
      await syncSharedSeats(sharingTeams(teams));
    } catch {
      // Tried again with the next change.
    }
  }, [syncSharedSeats]);

  // Joining, leaving or being taken off a team changes which seats are shared.
  useEffect(() => accountServer.subscribe(() => void syncShared()), [syncShared]);

  useEffect(() => {
    void loadOnboarding().then(async (loaded) => {
      recordRef.current = loaded;
      setRecord(loaded);
      // Bring the copy on the phone up to date with the account server. A copy
      // saved before there was a server (no ID) is registered, keeping its profile.
      const local = loaded.account;
      if (!local) return;
      try {
        let account = local.id ? await accountServer.getAccount(local.id) : null;
        if (!account) {
          account = await accountServer.signIn(local.phoneNumber);
          if (!account.name && (local.name || local.relationship)) {
            account = await accountServer.updateProfile(account.id, { name: local.name, relationship: local.relationship });
          }
        }
        const synced = account;
        await update((current) => (current.account ? { ...current, account: synced } : current));
        // Catch the account's saved copy up with the phone, in case a save was missed.
        if (loaded.completed && loaded.phoneNumber) await saveData(synced.id);
      } catch {
        // Tried again at the next launch.
      }
      // Teams may have changed while the app was closed.
      await syncShared();
    });
  }, [update, saveData, syncShared]);

  // Every change to the seats or settings is saved with the logged-in account too.
  useEffect(() => {
    setDataHandler((changedSeats, changedSettings) => {
      const current = recordRef.current;
      if (current?.phoneNumber && current.account?.id && !holdSync.current) {
        void saveData(current.account.id, { seats: changedSeats, settings: changedSettings });
      }
    });
  }, [setDataHandler, saveData]);

  // The seats greet the user by name when someone gets in.
  useEffect(() => setUserName(userName), [setUserName, userName]);

  // Seats connect by themselves once setup is done, but not during setup
  // (pairing does that) or while logged out. Turning it off disconnects them.
  const watching = !!record?.completed && !!record.phoneNumber;
  useEffect(() => setAutoConnect(watching), [setAutoConnect, watching]);

  const choosePath = useCallback((next: OnboardingPath) => {
    pathRef.current = next;
    setPath(next);
  }, []);

  const goNext = useCallback((current: StepId) => {
    const next = nextStep(pathRef.current, current);
    if (next) router.push(stepHref(next));
  }, []);

  const acceptInvite = useCallback((invite: Invite) => {
    pendingInvite.current = invite;
  }, []);

  const joinInvite = useCallback(
    async (invite: Invite) => {
      const accountId = recordRef.current?.account?.id ?? '';
      await accountServer.acceptInvite(accountId, invite);
      // Now rather than at the next change. Opening the same invite twice doesn't add them twice.
      await syncShared();
    },
    [syncShared],
  );

  /** In setup, the invite accepted earlier is joined right after logging in. */
  const joinPendingInvite = useCallback(async (): Promise<unknown> => {
    const invite = pendingInvite.current;
    if (pathRef.current !== 'invite' || !invite) return null;
    try {
      await joinInvite(invite);
      pendingInvite.current = null;
      return null;
    } catch (e) {
      return e;
    }
  }, [joinInvite]);

  /**
   * Once logged in: joins the invite accepted in setup, and brings in the
   * seats the account's teams share. Resolves like joinPendingInvite.
   */
  const settleLogIn = useCallback(async (): Promise<unknown> => {
    const joinError = await joinPendingInvite();
    await syncShared();
    return joinError;
  }, [joinPendingInvite, syncShared]);

  if (!record) return null; // loads from disk in a few milliseconds

  const accountId = () => recordRef.current?.account?.id ?? '';
  const phoneHasData = record.completed || seats.length > 0;

  const value: OnboardingContextValue = {
    ...record,
    path,
    choosePath,
    goNext,
    acceptInvite,
    planLogin: (phoneNumber) => planLogin(record.account, phoneNumber, phoneHasData),
    signIn: async (phoneNumber) => {
      const account = await accountServer.signIn(phoneNumber);
      await update((current) => ({ ...current, phoneNumber, account }));
      // In setup with nothing on the phone yet, what's saved with the account can come back.
      if (!recordRef.current?.completed) {
        const saved = await accountServer.loadAccountData(account.id);
        if (canRestore(latest.current.seats, saved)) {
          holdSync.current = true;
          return { account, joinError: null, restorable: saved };
        }
      }
      await saveData(account.id);
      return { account, joinError: await settleLogIn(), restorable: null };
    },
    switchAccount: async (phoneNumber) => {
      const from = recordRef.current?.account;
      if (from?.id) await saveData(from.id);
      const account = await accountServer.signIn(phoneNumber);
      const saved = await accountServer.loadAccountData(account.id);
      const nextSeats = saved?.seats ?? [];
      const nextSettings = saved?.settings ?? DEFAULT_SETTINGS;
      // Do not sync incoming seats to the outgoing account during the handoff.
      holdSync.current = true;
      try {
        await replaceData(nextSeats, nextSettings);
      } catch (error) {
        holdSync.current = false;
        throw error;
      }
      latest.current = { seats: nextSeats, settings: nextSettings };
      // From the login screen, somebody new goes through setup, already logged in.
      const restored = !!recordRef.current?.completed && nextSeats.length > 0;
      if (recordRef.current?.completed) {
        choosePath('self');
        pendingInvite.current = null;
      }
      await update(() => ({ completed: restored, phoneNumber, account }));
      holdSync.current = false;
      return { account, joinError: await settleLogIn(), restorable: null, restored };
    },
    restore: async (saved) => {
      holdSync.current = false;
      await replaceData(saved.seats, saved.settings);
      latest.current = { seats: saved.seats, settings: saved.settings };
      return settleLogIn();
    },
    skipRestore: async () => {
      holdSync.current = false;
      if (accountId()) await saveData(accountId());
      return settleLogIn();
    },
    joinInvite,
    changeNumber: async (phoneNumber) => {
      const account = await accountServer.changeNumber(accountId(), phoneNumber);
      await update((current) => ({ ...current, phoneNumber, account }));
    },
    updateProfile: async (changes) => {
      if (!accountId()) return;
      const account = await accountServer.updateProfile(accountId(), changes);
      await update((current) => ({ ...current, account }));
    },
    deleteAccount: async () => {
      if (accountId()) await accountServer.deleteAccount(accountId());
    },
    // These also end the texting service's session (Supabase), if there is one.
    signOut: async () => {
      void phoneAuth.signOut?.();
      if (accountId()) await saveData(accountId());
      await update((current) => ({ ...current, phoneNumber: null }));
    },
    complete: () => update((current) => ({ ...current, completed: true })),
    finishLogIn: async () => {
      // A new phone, or the app put back on, hasn't been asked for
      // notifications yet; setup asks, and pairs the seats with this phone.
      if (latest.current.seats.length > 0 && notificationsAllowed) {
        await update((current) => ({ ...current, completed: true }));
      } else {
        goNext('sign-in');
      }
    },
    restart: () => {
      void phoneAuth.signOut?.();
      return update((current) => ({ ...NEW_ONBOARDING, account: current.account }));
    },
    eraseAccount: () => {
      void phoneAuth.signOut?.();
      pendingInvite.current = null;
      holdSync.current = false;
      return update(() => NEW_ONBOARDING);
    },
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  return value;
}
