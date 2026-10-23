import { redirectInviteLink } from '../onboarding/invite';

/**
 * Expo Router calls this with each link the system opens the app with, before
 * it picks a route. Invite links from before point at /onboarding/invite,
 * which only exists during setup, so they're sent to the invite page instead.
 * It must never throw.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return redirectInviteLink(path);
  } catch {
    return path;
  }
}
