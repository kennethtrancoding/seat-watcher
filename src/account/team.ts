/**
 * Teams: the people who help watch someone's seats. Everyone can have one
 * team of their own, for their own seats: they own it, and everyone they
 * invite joins as a helper. They can also help on any number of other
 * people's teams, whose seats are then shared with them. Only a team's owner
 * can invite or remove people, or change its seats. The account server keeps
 * teams (see server.ts). Pure: no React or native imports.
 */

import { locale } from '../i18n/i18n';
import type { SharingTeam } from '../seats/seats';
import { parseSeatSettings, type SeatSettings } from '../settings/settings';
import type { Relationship } from './account';

export type Role = 'owner' | 'helper';

export interface Member {
  id: string;
  /** The member's account. Someone who joined on another phone has an ID this phone's server doesn't know. */
  accountId: string;
  role: Role;
  name: string;
  relationship: Relationship | null;
  /** E.164, or '' when this phone doesn't know it. */
  phoneNumber: string;
  joinedAt: number;
  /** Made up by "Pretend invites were accepted" on the pretend server. */
  pretend: boolean;
}

export type InviteStatus = 'waiting' | 'accepted' | 'cancelled' | 'expired';

export interface TeamInvite {
  /** Six letters and digits, in the invite link. */
  code: string;
  createdAt: number;
  expiresAt: number;
  acceptedAt: number | null;
  cancelledAt: number | null;
}

/** An invite as the owner sees it, with its status by the server's clock. */
export interface TeamInviteView extends TeamInvite {
  status: 'waiting' | 'expired';
}

/** A seat a team watches: one of its owner's own seats. */
export interface TeamSeat {
  /** The seat's ID on its owner's phone. */
  id: string;
  childName: string;
}

/** A team as one of its members sees it. */
export interface TeamView {
  id: string;
  /** Your role on it. */
  role: Role;
  /** The owner first, then helpers in the order they joined. */
  members: Member[];
  /** Invites still waiting or expired, newest first. Only the owner sees these. */
  invites: TeamInviteView[];
  /** The seats the team watches: the owner's own, as their phone last saved them. */
  seats: TeamSeat[];
  /**
   * The owner's settings for those seats, as their phone last saved them,
   * which every phone on the team watches them with. Null if the server
   * doesn't know them (a team copied from a link).
   */
  seatSettings: SeatSettings | null;
}

/** Helpers plus invites still waiting can't go past this. */
export const MAX_HELPERS = 5;

export const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

/** No 0/O or 1/I, so a code read aloud or typed can't be mixed up. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;
const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

export function makeInviteCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}

/** The code in a canonical form, or null if it can't be an invite code. */
export function cleanInviteCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

export function inviteStatus(invite: TeamInvite, now: number): InviteStatus {
  if (invite.acceptedAt !== null) return 'accepted';
  if (invite.cancelledAt !== null) return 'cancelled';
  return now >= invite.expiresAt ? 'expired' : 'waiting';
}

/** The owner's member entry. */
export function teamOwner(team: TeamView): Member | undefined {
  return team.members.find((m) => m.role === 'owner');
}

/** Your own team, among the teams you're on (null before your first invite). */
export function ownTeam(teams: readonly TeamView[]): TeamView | null {
  return teams.find((t) => t.role === 'owner') ?? null;
}

/** The teams you help, in the order you joined them. */
export function helpedTeams(teams: readonly TeamView[]): TeamView[] {
  return teams.filter((t) => t.role === 'helper');
}

/** The teams you help, and the seats each shares with you, for withSharedSeats in seats.ts. */
export function sharingTeams(teams: readonly TeamView[]): SharingTeam[] {
  return helpedTeams(teams).map((team) => ({
    teamId: team.id,
    ownerName: teamOwner(team)?.name ?? '',
    // Checked like everything else this phone alerts with; unusable ones fall back to yours.
    seatSettings: parseSeatSettings(team.seatSettings),
    seats: team.seats,
  }));
}

/** Helpers who joined, and invites still waiting. */
export function teamCounts(team: TeamView | null): { helpers: number; waiting: number } {
  if (!team) return { helpers: 0, waiting: 0 };
  return {
    helpers: team.members.filter((m) => m.role === 'helper').length,
    waiting: team.invites.filter((i) => i.status === 'waiting').length,
  };
}

/** "Oct 13", for when someone joined or an invite was sent. */
export function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString(locale(), { month: 'short', day: 'numeric' });
}
