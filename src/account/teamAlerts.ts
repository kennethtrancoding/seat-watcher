/**
 * Team alerts: telling the rest of the team about a child's seat. A phone that
 * alerts by itself (see activeConditions in AlertEngine.ts) also raises a team
 * alert on the account server, with the seat's team: yours for your own
 * seats, the sharing team's for a seat shared with you. For two things:
 *
 * - No one left with the seat ('leftAlone'): raised by the last caregiver to
 *   leave. The server tells the team's owner straight away and everyone else
 *   once it has gone on for the owner's wait (Settings.backupAfterMinutes),
 *   unless it ends first: someone came back to the seat, or the child was
 *   taken out.
 * - The seat is too hot ('tooHot'): raised by any phone that sees it. The
 *   server tells everyone on the team straight away, even with a caregiver
 *   right by the seat.
 *
 * The server keeps the clock, because a phone that lost touch with the seat
 * may not be woken again to keep it. Pure: no React or native imports.
 */

import type { AlertKind } from '../alerts/AlertEngine';
import type { AccountServer } from './server';
import type { Member } from './team';

export type TeamAlertKind = 'leftAlone' | 'tooHot';

/** Which seat an alert is about, the way its team knows it. */
export interface AlertSeat {
  /** The team that shares the seat with you, or null for your own seat (your own team hears). */
  teamId: string | null;
  /** The seat's ID on its team: its owner's ID for it, the same on every phone. */
  seatId: string;
  /** For the alert's text ('' if unnamed). */
  childName: string;
}

export interface TeamAlert {
  id: string;
  kind: TeamAlertKind;
  /** The child whose seat it's about ('' if unnamed). */
  childName: string;
  /** The account whose phone raised it first. */
  raisedBy: string;
  raisedAt: number;
  /** When it ended, or null while it's still going. */
  endedAt: number | null;
}

/**
 * Why someone hears about an alert: they raised it (their own phone alerted),
 * they own the team (told straight away), or they're everyone else (told after
 * the wait, or straight away for a hot seat).
 */
export type DeliveryReason = 'raised' | 'owner' | 'backup';

export interface AlertDelivery {
  member: Member;
  reason: DeliveryReason;
  /** When they're told. */
  at: number;
  /** Whether that has happened by the server's clock. */
  sent: boolean;
}

/** The alerts that mean no caregiver is with the seat. */
export const LEFT_ALONE_ALERTS: readonly AlertKind[] = ['tooFar', 'connectionLost'];

/** The team alerts a seat's active alerts call for. */
export function teamAlertKinds(activeAlerts: readonly AlertKind[]): TeamAlertKind[] {
  const kinds: TeamAlertKind[] = [];
  if (activeAlerts.some((kind) => LEFT_ALONE_ALERTS.includes(kind))) kinds.push('leftAlone');
  if (activeAlerts.includes('temperatureHigh')) kinds.push('tooHot');
  return kinds;
}

/**
 * Who hears about `alert`, and when: whoever raised it and the team's owner at
 * once, and everyone else after `backupAfterMinutes`, or at once for a hot
 * seat. Anyone the alert ended before isn't told at all. By the server's clock `now`.
 */
export function alertDeliveries(
  members: readonly Member[],
  alert: TeamAlert,
  backupAfterMinutes: number,
  now: number,
): AlertDelivery[] {
  const backupAt = alert.kind === 'tooHot' ? alert.raisedAt : alert.raisedAt + backupAfterMinutes * 60_000;
  return members.flatMap((member) => {
    const reason: DeliveryReason =
      member.accountId === alert.raisedBy ? 'raised' : member.role === 'owner' ? 'owner' : 'backup';
    const at = reason === 'backup' ? backupAt : alert.raisedAt;
    if (alert.endedAt !== null && at > alert.endedAt) return [];
    return [{ member, reason, at, sent: at <= now }];
  });
}

interface OpenAlert {
  accountId: string;
  alertId: Promise<string | null>;
}

/**
 * Raises and ends team alerts as seats' alerts come and go on this phone. One
 * team alert of each kind per seat at a time: walking from "too far away" on
 * into "lost touch" is the same alert, so the owner hears once and the
 * helpers' wait doesn't start over.
 */
export class TeamAlerter {
  /** By team, seat ID and kind: the alert raised (null: no team to tell), with who raised it. */
  private open = new Map<string, OpenAlert>();

  constructor(private server: Pick<AccountServer, 'raiseAlert' | 'endAlert'>) {}

  /**
   * Call with every seat as its state changes. `accountId` is who's logged in
   * on this phone (null: no one, so there's no team to tell).
   */
  observe(
    accountId: string | null,
    seats: readonly (AlertSeat & { activeAlerts: readonly AlertKind[] })[],
  ): void {
    const wanted = new Set<string>();
    for (const seat of seats) {
      if (!accountId) continue;
      for (const kind of teamAlertKinds(seat.activeAlerts)) {
        const key = `${seat.teamId ?? ''} ${seat.seatId} ${kind}`;
        wanted.add(key);
        if (this.open.has(key)) continue;
        const raised: OpenAlert = { accountId, alertId: Promise.resolve(null) };
        const { teamId, seatId, childName } = seat;
        raised.alertId = this.server.raiseAlert(accountId, kind, { teamId, seatId, childName }).catch(() => {
          // Try again with the next change.
          if (this.open.get(key) === raised) this.open.delete(key);
          return null;
        });
        this.open.set(key, raised);
      }
    }
    for (const [key, raised] of this.open) {
      if (wanted.has(key)) continue;
      this.open.delete(key);
      void raised.alertId
        .then((id) => (id ? this.server.endAlert(raised.accountId, id) : undefined))
        .catch(() => {});
    }
  }
}
