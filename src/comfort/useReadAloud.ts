import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useMonitor } from '../monitor/MonitorProvider';
import { speak, stopSpeaking } from './speech';

/**
 * With "Read screens aloud" on, reads `text` when the screen comes into view
 * (and again if the text changes), and stops when the screen is left.
 */
export function useReadAloud(text: string): void {
  const { settings } = useMonitor();
  const enabled = settings.readAloud;
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      void speak(text);
      return stopSpeaking;
    }, [enabled, text]),
  );
}
