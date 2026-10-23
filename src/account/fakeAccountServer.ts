/**
 * A pretend account server that lives on the phone, until there's a real one.
 * It behaves the way a server would: every call is asynchronous and takes a
 * moment, checks who's asking, refuses what they may not do (a helper can't
 * invite or remove people on a team they help, or pass its seats on), and
 * keeps its data in storage of its own, apart from the app's. Deleting an
 * account erases the phone but leaves the other accounts here, so logging in
 * as one of them brings back its name, team and seats, as a real server
 * would. The Developer screen's factory reset empties it too
 * (`pretend.reset(null)`).
 *
 * What it can't do is talk to other phones:
 * - An invite sent from here is only really accepted if it's opened on this
 *   same phone (by a different account). Opened on another phone, that
 *   phone's pretend server makes its own copy of the team from the link.
 * - So the owner's team never hears that someone joined. On the Developer
 *   screen, `pretend.acceptWaitingInvites` stands in for that.
 * - A copied team's seats are the ones the link named, and stay that way: the
 *   owner's phone can't tell this one about new or renamed seats, or its
 *   settings for them, so the helper's own settings are used for those.
 * - Team alerts are kept and timed, but no one else is told: that takes push
 *   notifications from a real server. `pretend.alertLog` shows who would be.
 *
 * Pure: the storage, clock and randomness are passed in, so tests run it in Node.
 */

import { RELATIONSHIPS, MAX_PROFILE_NAME_LENGTH, newAccount, parseAccount, type Account, type Relationship } from './account';
import type { Invite } from '../onboarding/invite';
import { MAX_CHILD_NAME_LENGTH, MAX_SEATS, ownSeats, parseSeats, type Seat } from '../seats/seats';
import { DEFAULT_SETTINGS, parseStoredSettings, seatSettingsOf } from '../settings/settings';
import { AccountError, type AccountData, type AccountServer, type ProfileChanges } from './server';
import {
  INVITE_LIFETIME_MS,
  MAX_HELPERS,
  cleanInviteCode,
  inviteStatus,
  makeInviteCode,
  type Member,
  type Role,
  type TeamInvite,
  type TeamInviteView,
  type TeamSeat,
  type TeamView,
} from './team';
import { alertDeliveries, type AlertDelivery, type AlertSeat, type TeamAlert, type TeamAlertKind } from './teamAlerts';

interface StoredTeam {
  id: string;
  members: Member[];
  invites: TeamInvite[];
  /**
   * What the team watches: the owner's own seats, as their phone last saved
   * them (saveAccountData) or sent them with an invite. On a copy, the ones
   * the link named.
   */
  seats: TeamSeat[];
  createdAt: number;
  /** On a copy made from someone else's invite link: that invite's code. */
  joinedWithCode: string | null;
}

interface StoredAlert extends TeamAlert {
  teamId: string;
  /** The seat's ID on the team, which tells two phones' alerts about the same seat apart. */
  seatId: string;
  /** The accounts whose phones raised it and still see it. It ends when none do. */
  openBy: string[];
}

/** How many alerts the server keeps, all teams together. */
const KEPT_ALERTS = 50;
/** How many the alert log shows. */
const LOGGED_ALERTS = 5;

/** Everything the server keeps. */
export interface ServerData {
  version: 1;
  accounts: Account[];
  teams: StoredTeam[];
  /** The seats and settings saved with each account, by account ID. */
  saved: Record<string, AccountData>;
  /** Team alerts, oldest first. */
  alerts: StoredAlert[];
}

export interface ServerStorage {
  /** What was saved last, or null. */
  load(): Promise<unknown>;
  save(data: ServerData): Promise<void>;
}

export interface FakeAccountServerOptions {
  storage: ServerStorage;
  now?: () => number;
  random?: () => number;
  /** How long each call takes, like a trip over the network. Default 250 ms. */
  latencyMs?: number;
}

/** Who joins when "Pretend invites were accepted" is tapped. */
const PRETEND_HELPERS: { name: string; relationship: Relationship }[] = [
  { name: 'Rosa', relationship: 'grandparent' },
  { name: 'Marcus', relationship: 'family' },
  { name: 'Priya', relationship: 'sitter' },
  { name: 'Sam', relationship: 'other' },
  { name: 'Lena', relationship: 'grandparent' },
];

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const emptyData = (): ServerData => ({ version: 1, accounts: [], teams: [], saved: {}, alerts: [] });

export class FakeAccountServer implements AccountServer {
  private data: Promise<ServerData> | null = null;
  private listeners = new Set<() => void>();
  private now: () => number;
  private random: () => number;

  constructor(private options: FakeAccountServerOptions) {
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
  }

  async signIn(phoneNumber: string): Promise<Account> {
    const db = await this.begin();
    let account = db.accounts.find((a) => a.phoneNumber === phoneNumber);
    if (!account) {
      account = newAccount(this.makeId('acct'), phoneNumber, this.now());
      db.accounts.push(account);
      await this.commit(db);
    }
    return clone(account);
  }

  async getAccount(accountId: string): Promise<Account | null> {
    const db = await this.begin();
    const account = db.accounts.find((a) => a.id === accountId);
    return account ? clone(account) : null;
  }

  async updateProfile(accountId: string, changes: ProfileChanges): Promise<Account> {
    const db = await this.begin();
    const account = accountIn(db, accountId);
    if (changes.name !== undefined) account.name = changes.name.trim().slice(0, MAX_PROFILE_NAME_LENGTH);
    if (changes.relationship !== undefined) account.relationship = changes.relationship;
    await this.commit(db);
    return clone(account);
  }

  async changeNumber(accountId: string, phoneNumber: string): Promise<Account> {
    const db = await this.begin();
    const account = accountIn(db, accountId);
    if (db.accounts.some((a) => a.phoneNumber === phoneNumber && a.id !== accountId)) {
      throw new AccountError('numberTaken');
    }
    account.phoneNumber = phoneNumber;
    await this.commit(db);
    return clone(account);
  }

  async deleteAccount(accountId: string): Promise<void> {
    const db = await this.begin();
    accountIn(db, accountId);
    for (const team of teamsOf(db, accountId)) {
      if (roleOn(team, accountId) === 'owner') removeTeam(db, team);
      else leave(db, team, accountId);
    }
    db.accounts = db.accounts.filter((a) => a.id !== accountId);
    delete db.saved[accountId];
    await this.commit(db);
  }

  async loadAccountData(accountId: string): Promise<AccountData | null> {
    const db = await this.begin();
    accountIn(db, accountId);
    const saved = db.saved[accountId];
    return saved ? clone(saved) : null;
  }

  async saveAccountData(accountId: string, data: Pick<AccountData, 'seats' | 'settings'>): Promise<void> {
    const db = await this.begin();
    accountIn(db, accountId);
    db.saved[accountId] = clone({ seats: data.seats, settings: data.settings, savedAt: this.now() });
    // The team watches the account's own seats, as they are now.
    const team = ownTeamOf(db, accountId);
    if (team) team.seats = teamSeatsFrom(data.seats);
    // Only the phone that saved it is logged in to this account, so subscribers aren't told.
    await this.commit(db, false);
  }

  async getTeams(accountId: string): Promise<TeamView[]> {
    const db = await this.begin();
    accountIn(db, accountId);
    return teamsOf(db, accountId).map((team) => this.view(db, team, accountId));
  }

  async createInvite(accountId: string, seats: TeamSeat[]): Promise<TeamInvite> {
    const db = await this.begin();
    const account = accountIn(db, accountId);
    const named = seats.map((s) => ({ id: s.id, childName: s.childName.trim() }));
    if (!named.length || named.some((s) => !s.id || !s.childName)) throw new AccountError('noSeats');
    // Someone else's seat, shared with the caller, is its owner's to share.
    const shared = new Set(db.saved[accountId]?.seats.filter((s) => s.sharedBy).map((s) => s.id));
    if (named.some((s) => shared.has(s.id))) throw new AccountError('notAllowed');

    let team = ownTeamOf(db, accountId);
    const now = this.now();
    const helpers = team?.members.filter((m) => m.role === 'helper').length ?? 0;
    const waiting = team?.invites.filter((i) => inviteStatus(i, now) === 'waiting').length ?? 0;
    if (helpers + waiting >= MAX_HELPERS) throw new AccountError('teamFull');

    if (!team) {
      team = {
        id: this.makeId('team'),
        members: [this.memberFor(account, 'owner')],
        invites: [],
        seats: [],
        createdAt: now,
        joinedWithCode: null,
      };
      db.teams.push(team);
    }
    team.seats = named;
    const invite: TeamInvite = {
      code: this.uniqueCode(db),
      createdAt: now,
      expiresAt: now + INVITE_LIFETIME_MS,
      acceptedAt: null,
      cancelledAt: null,
    };
    team.invites.push(invite);
    await this.commit(db);
    return clone(invite);
  }

  async cancelInvite(accountId: string, code: string): Promise<void> {
    const db = await this.begin();
    accountIn(db, accountId);
    const invite = ownTeamOf(db, accountId)?.invites.find((i) => i.code === code);
    if (!invite) {
      // Another team's invite is its owner's to cancel.
      if (db.teams.some((t) => t.invites.some((i) => i.code === code))) throw new AccountError('notAllowed');
      throw new AccountError('inviteNotFound');
    }
    if (invite.acceptedAt !== null) throw new AccountError('inviteUsed');
    invite.cancelledAt ??= this.now();
    await this.commit(db);
  }

  async acceptInvite(accountId: string, invite: Invite): Promise<TeamView> {
    const db = await this.begin();
    const account = accountIn(db, accountId);
    // A link from before invites had codes has none: it can only be copied.
    const code = invite.code ? cleanInviteCode(invite.code) : '';
    if (code === null) throw new AccountError('inviteNotFound');
    const now = this.now();
    // The team that sent it, if it was sent from this phone.
    const sender = code ? db.teams.find((t) => t.invites.some((i) => i.code === code)) : undefined;
    const role = sender ? roleOn(sender, accountId) : null;
    if (role === 'owner') throw new AccountError('ownInvite');

    // Opened twice: already on the team. Being on other teams, or having your own, doesn't matter.
    const already = role === 'helper' ? sender : teamsOf(db, accountId).find((t) => isCopyOf(t, invite, code));
    if (already) return this.view(db, already, accountId);
    const sent = sender?.invites.find((i) => i.code === code);
    if (sent) {
      const status = inviteStatus(sent, now);
      if (status === 'accepted') throw new AccountError('inviteUsed');
      if (status === 'cancelled') throw new AccountError('inviteCancelled');
      if (status === 'expired') throw new AccountError('inviteExpired');
    }

    let team: StoredTeam;
    if (sender && sent) {
      sent.acceptedAt = now;
      sender.members.push(this.memberFor(account, 'helper'));
      team = sender;
    } else {
      // Sent from another phone: copy the team from the link. A real server
      // would look the code up, check it, and add this account to the real team.
      const id = this.makeId('team');
      team = {
        id,
        members: [
          {
            id: this.makeId('mem'),
            accountId: this.makeId('acct'),
            role: 'owner',
            name: invite.from,
            relationship: null,
            phoneNumber: '',
            joinedAt: now,
            pretend: false,
          },
          this.memberFor(account, 'helper'),
        ],
        invites: [],
        seats: invite.childNames.map((childName, i) => ({ id: `${id}-seat-${i + 1}`, childName })),
        createdAt: now,
        joinedWithCode: code,
      };
      db.teams.push(team);
    }
    await this.commit(db);
    return this.view(db, team, accountId);
  }

  async removeMember(accountId: string, memberId: string): Promise<void> {
    const db = await this.begin();
    accountIn(db, accountId);
    // Only from your own team: another team's people are its owner's to remove.
    const team = ownTeamOf(db, accountId);
    const member = team?.members.find((m) => m.id === memberId);
    if (!team || !member || member.role === 'owner') throw new AccountError('notAllowed');
    team.members = team.members.filter((m) => m !== member);
    await this.commit(db);
  }

  async leaveTeam(accountId: string, teamId: string): Promise<void> {
    const db = await this.begin();
    accountIn(db, accountId);
    const team = db.teams.find((t) => t.id === teamId);
    if (!team || roleOn(team, accountId) !== 'helper') throw new AccountError('notAllowed');
    leave(db, team, accountId);
    await this.commit(db);
  }

  async raiseAlert(accountId: string, kind: TeamAlertKind, seat: AlertSeat): Promise<string | null> {
    const db = await this.begin();
    accountIn(db, accountId);
    const team = seat.teamId === null ? ownTeamOf(db, accountId) : db.teams.find((t) => t.id === seat.teamId);
    // A shared seat's alert goes to the team that shares it, which the caller must still be on.
    if (seat.teamId !== null && (!team || !roleOn(team, accountId))) throw new AccountError('notAllowed');
    if (!team) return null;
    // Every phone on the team knows the seat by its owner's ID for it.
    const same = db.alerts.find(
      (a) => a.teamId === team.id && a.kind === kind && a.seatId === seat.seatId && a.endedAt === null,
    );
    if (same) {
      if (!same.openBy.includes(accountId)) {
        same.openBy.push(accountId);
        await this.commit(db);
      }
      return same.id;
    }
    const alert: StoredAlert = {
      id: this.makeId('alert'),
      teamId: team.id,
      seatId: seat.seatId,
      kind,
      childName: seat.childName,
      raisedBy: accountId,
      raisedAt: this.now(),
      endedAt: null,
      openBy: [accountId],
    };
    db.alerts = [...db.alerts, alert].slice(-KEPT_ALERTS);
    await this.commit(db);
    return alert.id;
  }

  async endAlert(accountId: string, alertId: string): Promise<void> {
    const db = await this.begin();
    accountIn(db, accountId);
    const alert = db.alerts.find((a) => a.id === alertId);
    if (!alert) throw new AccountError('notFound');
    if (!teamsOf(db, accountId).some((t) => t.id === alert.teamId)) throw new AccountError('notAllowed');
    if (alert.endedAt !== null || !alert.openBy.includes(accountId)) return;
    alert.openBy = alert.openBy.filter((id) => id !== accountId);
    if (alert.openBy.length === 0) alert.endedAt = this.now();
    await this.commit(db);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  readonly pretend = {
    acceptWaitingInvites: async (accountId: string): Promise<number> => {
      const db = await this.begin();
      accountIn(db, accountId);
      const team = ownTeamOf(db, accountId);
      if (!team) return 0;
      const now = this.now();
      const waiting = team.invites.filter((i) => inviteStatus(i, now) === 'waiting');
      for (const invite of waiting) {
        const taken = new Set(team.members.map((m) => m.name));
        const who = PRETEND_HELPERS.find((h) => !taken.has(h.name)) ?? PRETEND_HELPERS[0];
        // 555-0100 to 555-0199 are set aside for made-up numbers.
        const number = `+1555555${String(100 + Math.floor(this.random() * 100)).padStart(4, '0')}`;
        team.members.push({
          id: this.makeId('mem'),
          accountId: this.makeId('acct'),
          role: 'helper',
          name: who.name,
          relationship: who.relationship,
          phoneNumber: number,
          joinedAt: now,
          pretend: true,
        });
        invite.acceptedAt = now;
      }
      if (waiting.length) await this.commit(db);
      return waiting.length;
    },

    reset: async (keepAccountId: string | null): Promise<void> => {
      const db = await this.begin();
      const keep = db.accounts.find((a) => a.id === keepAccountId);
      db.accounts = keep ? [keep] : [];
      db.teams = [];
      db.saved = keep && db.saved[keep.id] ? { [keep.id]: db.saved[keep.id] } : {};
      db.alerts = [];
      await this.commit(db);
    },

    alertLog: async (accountId: string): Promise<{ alert: TeamAlert; deliveries: AlertDelivery[] }[]> => {
      const db = await this.begin();
      accountIn(db, accountId);
      const teams = new Map(teamsOf(db, accountId).map((team) => [team.id, team]));
      const now = this.now();
      return db.alerts
        .filter((a) => teams.has(a.teamId))
        .slice(-LOGGED_ALERTS)
        .reverse()
        .map((stored) => {
          const team = teams.get(stored.teamId)!;
          const { members } = this.view(db, team, accountId);
          const owner = team.members.find((m) => m.role === 'owner');
          // The owner's choice, saved with their account.
          const wait =
            db.saved[owner?.accountId ?? '']?.settings.backupAfterMinutes ?? DEFAULT_SETTINGS.backupAfterMinutes;
          const alert = teamAlert(stored);
          return { alert, deliveries: alertDeliveries(members, alert, wait, now) };
        });
    },
  };

  /** Waits like a network call would, then loads the data the first time. */
  private async begin(): Promise<ServerData> {
    const { latencyMs = 250 } = this.options;
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));
    this.data ??= this.options.storage.load().then(parseServerData, emptyData);
    return this.data;
  }

  private async commit(db: ServerData, notify = true): Promise<void> {
    await this.options.storage.save(db);
    if (notify) this.listeners.forEach((l) => l());
  }

  private view(db: ServerData, team: StoredTeam, accountId: string): TeamView {
    const role = roleOn(team, accountId) ?? 'helper';
    const now = this.now();
    // Profiles on this server are read fresh; others are as they were at joining.
    const members = team.members.map((m) => {
      const account = db.accounts.find((a) => a.id === m.accountId);
      return account
        ? { ...m, name: account.name, relationship: account.relationship, phoneNumber: account.phoneNumber }
        : { ...m };
    });
    members.sort((a, b) => (a.role === b.role ? a.joinedAt - b.joinedAt : a.role === 'owner' ? -1 : 1));
    const invites: TeamInviteView[] = [];
    if (role === 'owner') {
      for (const invite of team.invites) {
        const status = inviteStatus(invite, now);
        if (status === 'waiting' || status === 'expired') invites.push({ ...invite, status });
      }
      invites.sort((a, b) => b.createdAt - a.createdAt);
    }
    // The owner's settings for their seats, as they last saved them. A copied team's owner isn't on this server.
    const ownerData = db.saved[team.members.find((m) => m.role === 'owner')?.accountId ?? ''];
    return {
      id: team.id,
      role,
      members,
      invites,
      seats: team.seats.map((s) => ({ ...s })),
      seatSettings: ownerData ? seatSettingsOf(ownerData.settings) : null,
    };
  }

  private memberFor(account: Account, role: Role): Member {
    return {
      id: this.makeId('mem'),
      accountId: account.id,
      role,
      name: account.name,
      relationship: account.relationship,
      phoneNumber: account.phoneNumber,
      joinedAt: this.now(),
      pretend: false,
    };
  }

  private makeId(prefix: string): string {
    const random = Math.floor(this.random() * 36 ** 6).toString(36).padStart(6, '0');
    return `${prefix}_${this.now().toString(36)}${random}`;
  }

  private uniqueCode(db: ServerData): string {
    const used = new Set(db.teams.flatMap((t) => t.invites.map((i) => i.code)));
    let code = makeInviteCode(this.random);
    for (let tries = 0; used.has(code) && tries < 100; tries++) code = makeInviteCode(this.random);
    return code;
  }
}

/** Whether a team was copied from this invite's link before (it's being opened again). */
function isCopyOf(team: StoredTeam, invite: Invite, code: string): boolean {
  if (team.joinedWithCode === null) return false;
  if (code) return team.joinedWithCode === code;
  // Without a code, the same sender and children is the same invite.
  const owner = team.members.find((m) => m.role === 'owner');
  return (
    owner?.name === invite.from && team.seats.map((s) => s.childName).join('\n') === invite.childNames.join('\n')
  );
}

function accountIn(db: ServerData, accountId: string): Account {
  const account = db.accounts.find((a) => a.id === accountId);
  if (!account) throw new AccountError('notFound');
  return account;
}

/** The teams an account is on: its own first, then the ones it helps, in the order it joined them. */
function teamsOf(db: ServerData, accountId: string): StoredTeam[] {
  const joinedAt = (team: StoredTeam) => team.members.find((m) => m.accountId === accountId)?.joinedAt ?? 0;
  const helped = db.teams.filter((t) => roleOn(t, accountId) === 'helper').sort((a, b) => joinedAt(a) - joinedAt(b));
  const own = ownTeamOf(db, accountId);
  return own ? [own, ...helped] : helped;
}

/** The team an account owns, for its own seats. */
function ownTeamOf(db: ServerData, accountId: string): StoredTeam | undefined {
  return db.teams.find((t) => roleOn(t, accountId) === 'owner');
}

/** The seats a team watches, from what its owner's phone saved: their own, not the ones shared with them. */
function teamSeatsFrom(seats: readonly Seat[]): TeamSeat[] {
  return ownSeats(seats).map((s) => ({ id: s.id, childName: s.childName }));
}

function roleOn(team: StoredTeam, accountId: string): Role | null {
  return team.members.find((m) => m.accountId === accountId)?.role ?? null;
}

function removeTeam(db: ServerData, team: StoredTeam): void {
  db.teams = db.teams.filter((t) => t !== team);
  db.alerts = db.alerts.filter((a) => a.teamId !== team.id);
}

/** Takes a helper off a team. A copy with nobody from this phone left on it goes. */
function leave(db: ServerData, team: StoredTeam, accountId: string): void {
  team.members = team.members.filter((m) => m.accountId !== accountId);
  if (!team.members.some((m) => db.accounts.some((a) => a.id === m.accountId))) removeTeam(db, team);
}

/** Turns whatever was stored into server data, dropping anything unusable. */
export function parseServerData(stored: unknown): ServerData {
  if (typeof stored !== 'object' || stored === null) return emptyData();
  const { accounts, teams, saved, alerts } = stored as Record<string, unknown>;
  const parsedAccounts = (Array.isArray(accounts) ? accounts : [])
    .map(parseAccount)
    .filter((a): a is Account => !!a && !!a.id);
  const parsedSaved: Record<string, AccountData> = {};
  if (typeof saved === 'object' && saved !== null) {
    for (const [id, value] of Object.entries(saved)) {
      const data = parseAccountData(value);
      if (data && parsedAccounts.some((a) => a.id === id)) parsedSaved[id] = data;
    }
  }
  const parsedTeams = (Array.isArray(teams) ? teams : []).map(parseStoredTeam).filter((t): t is StoredTeam => t !== null);
  return {
    version: 1,
    accounts: parsedAccounts,
    teams: parsedTeams,
    saved: parsedSaved,
    // Data from before team alerts has none.
    alerts: (Array.isArray(alerts) ? alerts : [])
      .map(parseStoredAlert)
      .filter((a): a is StoredAlert => a !== null && parsedTeams.some((t) => t.id === a.teamId)),
  };
}

/** What the team sees of an alert: without the server's bookkeeping. */
function teamAlert(a: StoredAlert): TeamAlert {
  return { id: a.id, kind: a.kind, childName: a.childName, raisedBy: a.raisedBy, raisedAt: a.raisedAt, endedAt: a.endedAt };
}

function parseStoredAlert(stored: unknown): StoredAlert | null {
  if (typeof stored !== 'object' || stored === null) return null;
  const a = stored as Record<string, unknown>;
  if (typeof a.id !== 'string' || typeof a.teamId !== 'string' || typeof a.raisedBy !== 'string') return null;
  if (typeof a.raisedAt !== 'number') return null;
  const endedAt = typeof a.endedAt === 'number' ? a.endedAt : null;
  const openBy = Array.isArray(a.openBy) ? a.openBy.filter((id): id is string => typeof id === 'string') : [];
  return {
    id: a.id,
    teamId: a.teamId,
    // Alerts from before seats had team-wide IDs match no seat, so they aren't joined.
    seatId: typeof a.seatId === 'string' ? a.seatId : '',
    kind: a.kind === 'tooHot' ? 'tooHot' : 'leftAlone',
    childName: typeof a.childName === 'string' ? a.childName : '',
    raisedBy: a.raisedBy,
    raisedAt: a.raisedAt,
    endedAt,
    // An alert still going always has someone to end it.
    openBy: endedAt === null && openBy.length === 0 ? [a.raisedBy] : openBy,
  };
}

/** Saved seats and settings, checked the same way as the copies on the phone. */
function parseAccountData(stored: unknown): AccountData | null {
  if (typeof stored !== 'object' || stored === null) return null;
  const { seats, settings, savedAt } = stored as Record<string, unknown>;
  return {
    seats: parseSeats(seats),
    settings: parseStoredSettings(settings),
    savedAt: typeof savedAt === 'number' ? savedAt : 0,
  };
}

function parseStoredTeam(stored: unknown): StoredTeam | null {
  if (typeof stored !== 'object' || stored === null) return null;
  const { id, members, invites, seats, childNames, createdAt, joinedWithCode } = stored as Record<string, unknown>;
  if (typeof id !== 'string' || !Array.isArray(members)) return null;
  const parsedMembers = members.map(parseMember).filter((m): m is Member => m !== null);
  if (!parsedMembers.some((m) => m.role === 'owner')) return null;
  return {
    id,
    members: parsedMembers,
    invites: (Array.isArray(invites) ? invites : [])
      .map(parseTeamInvite)
      .filter((i): i is TeamInvite => i !== null),
    seats: Array.isArray(seats)
      ? seats.map(parseTeamSeat).filter((s): s is TeamSeat => s !== null).slice(0, MAX_SEATS)
      : // Teams from before they had seats named their children.
        (Array.isArray(childNames) ? childNames : [])
          .filter((n): n is string => typeof n === 'string')
          .map((childName, i) => ({ id: `${id}-seat-${i + 1}`, childName })),
    createdAt: typeof createdAt === 'number' ? createdAt : 0,
    joinedWithCode: typeof joinedWithCode === 'string' ? joinedWithCode : null,
  };
}

function parseTeamSeat(stored: unknown): TeamSeat | null {
  if (typeof stored !== 'object' || stored === null) return null;
  const { id, childName } = stored as Record<string, unknown>;
  if (typeof id !== 'string' || !id) return null;
  return { id, childName: typeof childName === 'string' ? childName.slice(0, MAX_CHILD_NAME_LENGTH) : '' };
}

function parseMember(stored: unknown): Member | null {
  if (typeof stored !== 'object' || stored === null) return null;
  const m = stored as Record<string, unknown>;
  if (typeof m.id !== 'string' || typeof m.accountId !== 'string') return null;
  if (m.role !== 'owner' && m.role !== 'helper') return null;
  return {
    id: m.id,
    accountId: m.accountId,
    role: m.role,
    name: typeof m.name === 'string' ? m.name : '',
    relationship: RELATIONSHIPS.includes(m.relationship as Relationship) ? (m.relationship as Relationship) : null,
    phoneNumber: typeof m.phoneNumber === 'string' ? m.phoneNumber : '',
    joinedAt: typeof m.joinedAt === 'number' ? m.joinedAt : 0,
    pretend: m.pretend === true,
  };
}

function parseTeamInvite(stored: unknown): TeamInvite | null {
  if (typeof stored !== 'object' || stored === null) return null;
  const i = stored as Record<string, unknown>;
  const code = cleanInviteCode(i.code);
  if (!code || typeof i.createdAt !== 'number' || typeof i.expiresAt !== 'number') return null;
  return {
    code,
    createdAt: i.createdAt,
    expiresAt: i.expiresAt,
    acceptedAt: typeof i.acceptedAt === 'number' ? i.acceptedAt : null,
    cancelledAt: typeof i.cancelledAt === 'number' ? i.cancelledAt : null,
  };
}
