/**
 * The car seats this phone watches. Each seat has its own child and its own
 * paired hardware; alert limits and units are shared (see settings.ts). Some
 * are your own; others are shared with you by the teams you help, and only
 * their owner can rename or remove those (see withSharedSeats).
 * Pure: no React or native imports.
 */

import { strings } from '../i18n/i18n';
import { parseSeatSettings, sameSeatSettings, type SeatSettings, type Settings } from '../settings/settings';

export interface Seat {
  /** Made on this phone when the seat is added. Used for storage and notification IDs. */
  id: string;
  /** "Emma", so alerts say "Emma's seat is too hot". Empty until set. */
  childName: string;
  /** Local file URI of the child's photo, or '' for none. */
  childPhotoUri: string;
  /**
   * The seat hardware this phone paired with (its CoreBluetooth identifier),
   * so it reconnects to that seat and not another. Null until the first
   * connection. The identifier is different on every phone.
   */
  deviceId: string | null;
  /** The name the hardware advertised when it was paired. */
  deviceName: string | null;
  /**
   * Connect by itself whenever the phone is near the seat. Turned off when the
   * user taps Disconnect, and back on when they tap Connect.
   */
  autoConnect: boolean;
  /**
   * Someone else's seat, shared with you by a team you help, or null for your
   * own. The name comes from its owner; the pairing, the photo and
   * autoConnect are this phone's own.
   */
  sharedBy: SeatShare | null;
}

/** Where a seat someone else shares with you comes from. */
export interface SeatShare {
  /** The team you help that shares it. */
  teamId: string;
  /** The seat's ID on that team (the ID its owner's phone gave it). */
  seatId: string;
  /** The owner's first name, for "Shared by Tam". '' if they haven't said. */
  ownerName: string;
  /**
   * The owner's settings for their seats (when it's too hot, too cold or too
   * far, and so on), which this phone watches it with. Null if they aren't
   * known (a team copied from a link), and then yours are used.
   */
  settings: SeatSettings | null;
}

/** A team you help, and the seats it shares with you (see team.ts › sharingTeams). */
export interface SharingTeam {
  teamId: string;
  ownerName: string;
  /** The owner's settings for their seats, or null if they aren't known. */
  seatSettings: SeatSettings | null;
  seats: readonly { id: string; childName: string }[];
}

/** How many seats of your own the phone watches. Seats shared with you come on top. */
export const MAX_SEATS = 4;
export const MAX_CHILD_NAME_LENGTH = 40;
const MAX_OWNER_NAME_LENGTH = 40;

export function newSeat(fields: Partial<Omit<Seat, 'id'>> = {}, id = makeSeatId()): Seat {
  return {
    id,
    childName: '',
    childPhotoUri: '',
    deviceId: null,
    deviceName: null,
    autoConnect: true,
    sharedBy: null,
    ...fields,
  };
}

/** Whether it's your own seat, which you can rename, remove and invite people to help watch. */
export function isOwnSeat(seat: Seat): boolean {
  return seat.sharedBy === null;
}

export function ownSeats(seats: readonly Seat[]): Seat[] {
  return seats.filter(isOwnSeat);
}

/**
 * The settings a seat is watched with: this phone's, with its owner's
 * settings for their seats in place of yours if it's shared with you. Your
 * own seats use yours as they are.
 */
export function settingsForSeat(settings: Settings, seat: Seat): Settings {
  const owners = seat.sharedBy?.settings;
  return owners ? { ...settings, ...owners } : settings;
}

/**
 * The phone's seats, with the ones shared with you brought in line with the
 * teams you help (all of them: a team that's missing is one you're no longer
 * on). A newly shared seat is added, a renamed one renamed (and its owner's
 * settings kept current), and one that's no longer shared removed. Your own
 * seats are left alone. Null if nothing changes.
 */
export function withSharedSeats(seats: readonly Seat[], teams: readonly SharingTeam[]): Seat[] | null {
  const key = (teamId: string, seatId: string) => `${teamId} ${seatId}`;
  const sources = new Map<string, { team: SharingTeam; seat: SharingTeam['seats'][number] }>();
  for (const team of teams) for (const seat of team.seats) sources.set(key(team.teamId, seat.id), { team, seat });

  let changed = false;
  const next: Seat[] = [];
  const kept = new Set<string>();
  for (const seat of seats) {
    if (!seat.sharedBy) {
      next.push(seat);
      continue;
    }
    const k = key(seat.sharedBy.teamId, seat.sharedBy.seatId);
    const source = sources.get(k);
    if (!source || kept.has(k)) {
      changed = true;
      continue;
    }
    kept.add(k);
    const childName = source.seat.childName.slice(0, MAX_CHILD_NAME_LENGTH);
    const ownerName = source.team.ownerName.slice(0, MAX_OWNER_NAME_LENGTH);
    const settings = source.team.seatSettings;
    if (
      seat.childName === childName &&
      seat.sharedBy.ownerName === ownerName &&
      sameSeatSettings(seat.sharedBy.settings, settings)
    ) {
      next.push(seat);
    } else {
      changed = true;
      next.push({ ...seat, childName, sharedBy: { ...seat.sharedBy, ownerName, settings } });
    }
  }
  for (const [k, { team, seat }] of sources) {
    if (kept.has(k)) continue;
    changed = true;
    next.push(
      newSeat({
        childName: seat.childName.slice(0, MAX_CHILD_NAME_LENGTH),
        sharedBy: {
          teamId: team.teamId,
          seatId: seat.id,
          ownerName: team.ownerName.slice(0, MAX_OWNER_NAME_LENGTH),
          settings: team.seatSettings,
        },
      }),
    );
  }
  return changed ? next : null;
}

export function makeSeatId(): string {
  return `seat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** "Emma's seat", or "the car seat" until a name is set, in the app's language. */
export function seatName(childName: string, startOfSentence = false): string {
  return strings().seats.name(childName, startOfSentence);
}

/** The seat as a heading (its screen, its card, its status line): "Emma's seat". */
export function seatTitle(childName: string): string {
  return strings().seats.title(childName);
}

/** "Emma's seat", "Emma's and Leo's seats", "your car seats": for sentences about all of them. */
export function seatsPhrase(childNames: readonly string[]): string {
  const t = strings().seats;
  const named = childNames.filter(Boolean);
  if (childNames.length === 1) return seatName(childNames[0]);
  if (named.length !== childNames.length || named.length === 0) return t.yours;
  return t.named(named);
}

/** An error for the child's name field, or undefined if it's fine. */
export function validateChildName(name: string): string | undefined {
  if (name.trim().length > MAX_CHILD_NAME_LENGTH) return strings().seats.nameTooLong(MAX_CHILD_NAME_LENGTH);
  return undefined;
}

/**
 * Turns whatever was stored into valid seats, dropping anything unusable,
 * duplicate IDs, and own seats past MAX_SEATS. A shared seat whose sharing
 * can't be read is dropped rather than becoming your own; it comes back with
 * the next sync with your teams.
 */
export function parseSeats(stored: unknown): Seat[] {
  if (!Array.isArray(stored)) return [];
  const seen = new Set<string>();
  const seats: Seat[] = [];
  let own = 0;
  for (const item of stored) {
    if (typeof item !== 'object' || item === null) continue;
    const { id, childName, childPhotoUri, deviceId, deviceName, autoConnect, sharedBy } = item as Record<string, unknown>;
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    // Seats saved before sharing existed are all your own.
    const share = sharedBy === undefined || sharedBy === null ? null : parseSeatShare(sharedBy);
    if (share === undefined) continue;
    if (!share && own >= MAX_SEATS) continue;
    seen.add(id);
    if (!share) own++;
    seats.push({
      id,
      childName: typeof childName === 'string' ? childName.slice(0, MAX_CHILD_NAME_LENGTH) : '',
      childPhotoUri: typeof childPhotoUri === 'string' ? childPhotoUri : '',
      deviceId: typeof deviceId === 'string' ? deviceId : null,
      deviceName: typeof deviceName === 'string' ? deviceName : null,
      // Seats saved before this existed connect by themselves too.
      autoConnect: autoConnect !== false,
      sharedBy: share,
    });
  }
  return seats;
}

/** Undefined if it can't be read. */
function parseSeatShare(stored: unknown): SeatShare | undefined {
  if (typeof stored !== 'object' || stored === null) return undefined;
  const { teamId, seatId, ownerName, settings } = stored as Record<string, unknown>;
  if (typeof teamId !== 'string' || !teamId || typeof seatId !== 'string' || !seatId) return undefined;
  return {
    teamId,
    seatId,
    ownerName: typeof ownerName === 'string' ? ownerName.slice(0, MAX_OWNER_NAME_LENGTH) : '',
    // Unreadable settings fall back to yours until the next sync brings the owner's again.
    settings: parseSeatSettings(settings),
  };
}

/**
 * Before the app knew about more than one seat, the child's name and photo
 * were part of the settings. Turns those into the first seat.
 */
export function seatsFromOldSettings(stored: unknown): Seat[] {
  if (typeof stored !== 'object' || stored === null) return [];
  const { childName, childPhotoUri } = stored as Record<string, unknown>;
  const name = typeof childName === 'string' ? childName : '';
  const photo = typeof childPhotoUri === 'string' ? childPhotoUri : '';
  return name || photo ? [newSeat({ childName: name, childPhotoUri: photo }, 'seat-1')] : [];
}
