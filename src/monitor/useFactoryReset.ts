import { useCallback } from 'react';

import { accountServer } from '../account/accountServer';
import { stopSpeaking } from '../comfort/speech';
import { deleteChildPhoto } from '../onboarding/childPhoto';
import { useOnboarding } from '../onboarding/OnboardingProvider';
import { useMonitor } from './MonitorProvider';

export interface FactoryResetOptions {
  /**
   * Empties the pretend account server too, so every account, team and
   * invite on it is gone (Developer › Reset to factory settings). A real
   * server has no such tool and keeps them.
   */
  emptyAccountServer?: boolean;
}

/**
 * Puts the app back the way it was installed, in one tap: disconnects every
 * seat, deletes the children's photos, clears notifications and everything
 * saved, restores the default settings and erases the account. The root
 * layout then shows the title card. Permissions already given stay given;
 * only iOS Settings can take those back.
 */
export function useFactoryReset(): (options?: FactoryResetOptions) => Promise<void> {
  const { seats, factoryReset } = useMonitor();
  const { eraseAccount } = useOnboarding();
  return useCallback(
    async ({ emptyAccountServer = false }: FactoryResetOptions = {}) => {
      stopSpeaking();
      for (const seat of seats) deleteChildPhoto(seat.childPhotoUri);
      await factoryReset();
      await eraseAccount();
      // Last, once logged out, so nothing on the phone reloads from it meanwhile.
      if (emptyAccountServer) await accountServer.pretend?.reset(null);
    },
    [seats, factoryReset, eraseAccount],
  );
}
