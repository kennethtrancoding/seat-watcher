import * as Location from 'expo-location';

import type { LocationProvider } from './SeatLocator';

/**
 * How much location access the user has granted.
 * - 'always': fixes also work while the phone is locked, which is most of a drive.
 * - 'whenInUse': fixes only work while the app is on screen.
 */
export type LocationAccess = 'always' | 'whenInUse' | 'denied' | 'undetermined';

// A fix normally takes a few seconds. Give up eventually so SeatLocator can retry.
const FIX_TIMEOUT_MS = 20_000;

/** Reads the phone's location with expo-location. */
export const deviceLocationProvider: LocationProvider = {
  async getCurrentLocation() {
    try {
      const { coords, timestamp } = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        FIX_TIMEOUT_MS,
      );
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyMeters: coords.accuracy,
        timestamp,
      };
    } catch {
      // No permission, no fix, or in the background without "Always" access.
      return null;
    }
  },
};

export async function getLocationAccess(): Promise<LocationAccess> {
  return accessFrom(await Location.getForegroundPermissionsAsync());
}

/**
 * Asks for "While Using the App", then offers "Always". The user can turn the
 * second one down; the feature still works but only updates while the app is open.
 */
export async function requestLocationAccess(): Promise<LocationAccess> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) return accessFrom(foreground);
  // Expo Go doesn't support background location, so this is denied (or throws) there.
  const background = await Location.requestBackgroundPermissionsAsync().catch(() => null);
  return background?.granted ? 'always' : 'whenInUse';
}

function accessFrom(permission: Location.LocationPermissionResponse): LocationAccess {
  if (permission.granted) return permission.ios?.scope === 'always' ? 'always' : 'whenInUse';
  return permission.status === 'undetermined' ? 'undetermined' : 'denied';
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timed out getting a location fix.')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
