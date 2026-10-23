import AsyncStorage from '@react-native-async-storage/async-storage';

import { ACCOUNT_SERVER_KEY } from '../account/accountServer';
import { DEFAULT_SETTINGS, parseStoredSettings, type Settings } from './settings';

const KEY = 'carSeatMonitor.settings.v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? parseStoredSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}

/**
 * Deletes everything the app has saved on the phone: settings, setup and
 * sign-in, and the last-seen location (factory reset). The pretend account
 * server's data stays, as a real server's would; it has its own reset
 * (`pretend.reset`), which the Developer screen's factory reset also calls.
 */
export async function eraseAllStoredData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((key) => key !== ACCOUNT_SERVER_KEY));
}
