import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { useMonitor } from '../monitor/MonitorProvider';
import { settingsToSave, validateSettings, type Settings, type SettingsErrors } from './settings';

/** How long typing has to pause before the typed values are checked and saved. */
const AUTOSAVE_DELAY_MS = 800;

export interface AutosavedDraft<D> {
  draft: D;
  setDraft: Dispatch<SetStateAction<D>>;
  /** Shown under the fields. A value with an error isn't saved until it's fixed. */
  errors: SettingsErrors;
  /** Shows these settings in the fields and clears the errors, e.g. after Restore defaults. */
  reset(settings: Settings): void;
}

/**
 * The typed values on a settings screen, kept as text and saved by themselves: once typing
 * pauses, and when the screen closes. Coming back to the screen shows what's saved, in case
 * another screen changed it. `toDraft` and `fromDraft` must not change between renders
 * (define them outside the component).
 */
export function useAutosavedDraft<D>(
  toDraft: (s: Settings) => D,
  fromDraft: (d: D, s: Settings) => Settings,
): AutosavedDraft<D> {
  const { settings, saveSettings } = useMonitor();
  const [draft, setDraft] = useState(() => toDraft(settings));
  const [errors, setErrors] = useState<SettingsErrors>({});
  const latest = useRef({ draft, settings });
  // Typed but not checked yet.
  const pending = useRef(false);

  useEffect(() => {
    latest.current = { draft, settings };
  });

  // Compared as text, so a unit change or a reset doesn't save rounded values.
  const isSaved = useCallback((d: D, s: Settings) => JSON.stringify(d) === JSON.stringify(toDraft(s)), [toDraft]);

  const commit = useCallback(
    (showErrors: boolean) => {
      pending.current = false;
      const { draft, settings } = latest.current;
      if (isSaved(draft, settings)) {
        if (showErrors) setErrors({});
        return;
      }
      const edited = fromDraft(draft, settings);
      const found = validateSettings(edited);
      if (showErrors) setErrors(found);
      const next = settingsToSave(settings, edited, found);
      if (next) void saveSettings(next);
    },
    [isSaved, fromDraft, saveSettings],
  );

  useEffect(() => {
    pending.current = !isSaved(draft, latest.current.settings);
    const timer = setTimeout(() => commit(true), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, isSaved, commit]);

  // Settings stays open under Developer options, whose Restore defaults changes what's typed
  // here. Back on this screen, show what's saved, unless there's typing still to check.
  // A value with an error was never saved, so it goes back to the saved one too.
  useFocusEffect(
    useCallback(() => {
      const { draft, settings } = latest.current;
      if (pending.current || isSaved(draft, settings)) return;
      setDraft(toDraft(settings));
      setErrors({});
    }, [isSaved, toDraft]),
  );

  // Leaving mid-edit still saves. Only then: after a factory reset, the old draft mustn't come back.
  useEffect(
    () => () => {
      if (pending.current) commit(false);
    },
    [commit],
  );

  const reset = useCallback(
    (next: Settings) => {
      setDraft(toDraft(next));
      setErrors({});
    },
    [toDraft],
  );

  return { draft, setDraft, errors, reset };
}
