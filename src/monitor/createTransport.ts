import { TurboModuleRegistry } from 'react-native';

import { SimulatedCarSeatTransport } from '../ble/SimulatedCarSeatTransport';
import type { BleTransportOptions } from '../ble/BleCarSeatTransport';
import type { BluetoothAccess, CarSeatTransport } from '../ble/transport';

type BleModule = typeof import('../ble/BleCarSeatTransport');

/**
 * Throws if Bluetooth isn't compiled into this build (e.g. Expo Go).
 *
 * react-native-ble-manager throws on import when its native module is missing,
 * and Metro reports errors from a lazy require() as fatal (red screen) even
 * inside try/catch. So check for the native module first and only then load it.
 */
export function createTransport(useSimulator: boolean, options: BleTransportOptions = {}): CarSeatTransport {
  if (useSimulator) return new SimulatedCarSeatTransport();
  const ble = loadBle();
  if (!ble) throw new Error('The Bluetooth native module is not in this build.');
  return new ble.BleCarSeatTransport(options);
}

/** Shows the iOS Bluetooth prompt if it hasn't been answered, and reports the result. */
export async function requestBluetoothAccess(): Promise<BluetoothAccess> {
  return (await loadBle()?.requestBluetoothAccess()) ?? 'unavailable';
}

function loadBle(): BleModule | null {
  if (!TurboModuleRegistry.get('BleManager')) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../ble/BleCarSeatTransport') as BleModule;
}
