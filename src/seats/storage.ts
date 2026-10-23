import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseSeats, seatsFromOldSettings, type Seat } from './seats';

const KEY = 'carSeatMonitor.seats.v1';
// Before more than one seat, the child's name and photo lived in the settings.
const OLD_SETTINGS_KEY = 'carSeatMonitor.settings.v1';

export async function loadSeats(): Promise<Seat[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return parseSeats(JSON.parse(raw));
    const old = await AsyncStorage.getItem(OLD_SETTINGS_KEY);
    return seatsFromOldSettings(old ? JSON.parse(old) : null);
  } catch {
    return [];
  }
}

export async function saveSeats(seats: readonly Seat[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(seats));
}
