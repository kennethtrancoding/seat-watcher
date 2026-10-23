import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useMonitor } from '../monitor/MonitorProvider';
import { useOnboarding } from '../onboarding/OnboardingProvider';
import { accountServer } from './accountServer';
import { helpedTeams, ownTeam, type TeamInvite, type TeamSeat, type TeamView } from './team';
import { TeamAlerter, type AlertDelivery, type TeamAlert } from './teamAlerts';

interface TeamContextValue {
  /**
   * Your own team: the people who help watch your own seats. Null before
   * your first invite, while logged out, or still loading.
   */
  ownTeam: TeamView | null;
  /** The teams you help, whose seats are shared with you, in the order you joined them. */
  helping: TeamView[];
  /** False until the first answer from the account server. */
  loaded: boolean;
  /**
   * These throw an AccountError (see accountErrorMessage) when the server
   * says no. Inviting, cancelling and removing are for your own team.
   */
  createInvite(seats: TeamSeat[]): Promise<TeamInvite>;
  cancelInvite(code: string): Promise<void>;
  removeMember(memberId: string): Promise<void>;
  /** Leaves a team you help. Its seats come off this phone (OnboardingProvider sees to that). */
  leave(teamId: string): Promise<void>;
  /** The pretend server's tools (Developer screen), or null with a real server. */
  pretend: {
    acceptWaitingInvites(): Promise<number>;
    reset(): Promise<void>;
    alertLog(): Promise<{ alert: TeamAlert; deliveries: AlertDelivery[] }[]>;
  } | null;
}

const TeamContext = createContext<TeamContextValue | null>(null);

const NO_TEAMS: TeamView[] = [];

/**
 * Your teams, from the account server, kept current as they change. Also
 * tells a seat's team when this phone finds no caregiver left with it, or
 * finds it too hot (see teamAlerts.ts).
 */
export function TeamProvider({ children }: { children: ReactNode }) {
  const { account, phoneNumber } = useOnboarding();
  const { seats, seatStates } = useMonitor();
  // Logged in, with an account the server knows.
  const accountId = phoneNumber !== null && account?.id ? account.id : null;
  const [alerter] = useState(() => new TeamAlerter(accountServer));

  useEffect(() => {
    alerter.observe(
      accountId,
      seats.map((seat) => ({
        // A shared seat's team knows it by its owner's ID for it.
        teamId: seat.sharedBy?.teamId ?? null,
        seatId: seat.sharedBy?.seatId ?? seat.id,
        childName: seat.childName,
        activeAlerts: seatStates[seat.id]?.state.activeAlerts ?? [],
      })),
    );
  }, [alerter, accountId, seats, seatStates]);
  const [state, setState] = useState<{ accountId: string | null; teams: TeamView[]; loaded: boolean }>({
    accountId: null,
    teams: [],
    loaded: false,
  });

  useEffect(() => {
    if (!accountId) return;
    let current = true;
    const load = () =>
      accountServer
        .getTeams(accountId)
        .then((teams) => current && setState({ accountId, teams, loaded: true }))
        .catch(() => current && setState({ accountId, teams: [], loaded: true }));
    void load();
    const unsubscribe = accountServer.subscribe(() => void load());
    return () => {
      current = false;
      unsubscribe();
    };
  }, [accountId]);

  const id = accountId ?? '';
  const createInvite = useCallback((seats: TeamSeat[]) => accountServer.createInvite(id, seats), [id]);
  const cancelInvite = useCallback((code: string) => accountServer.cancelInvite(id, code), [id]);
  const removeMember = useCallback((memberId: string) => accountServer.removeMember(id, memberId), [id]);
  const leave = useCallback((teamId: string) => accountServer.leaveTeam(id, teamId), [id]);

  const tools = accountServer.pretend;
  const pretend = useMemo(
    () =>
      tools
        ? {
            acceptWaitingInvites: () => tools.acceptWaitingInvites(id),
            reset: () => tools.reset(accountId),
            alertLog: () => (accountId ? tools.alertLog(accountId) : Promise.resolve([])),
          }
        : null,
    [tools, id, accountId],
  );
  // What was loaded for an earlier account doesn't count. Logged out, there's nothing to load.
  const fresh = accountId !== null && state.accountId === accountId;
  const teams = fresh ? state.teams : NO_TEAMS;
  // The same objects until the teams change, so screens can use them in effect dependencies.
  const own = useMemo(() => ownTeam(teams), [teams]);
  const helping = useMemo(() => helpedTeams(teams), [teams]);
  const value: TeamContextValue = {
    ownTeam: own,
    helping,
    loaded: accountId === null || (fresh && state.loaded),
    createInvite,
    cancelInvite,
    removeMember,
    leave,
    pretend,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam(): TeamContextValue {
  const value = useContext(TeamContext);
  if (!value) throw new Error('useTeam must be used inside <TeamProvider>');
  return value;
}
