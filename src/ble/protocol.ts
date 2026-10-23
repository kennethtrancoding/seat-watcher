/**
 * The BLE contract between this app and the car-seat firmware.
 *
 * Everything the firmware has to match lives in this file. If you change a
 * UUID or a byte format on the device, change it here too.
 *
 * GATT layout
 *   Service       CAR_SEAT_SERVICE_UUID    (advertise it, or advertise DEVICE_NAME)
 *   ├─ Temperature   read + notify   int16 little-endian, hundredths of °C
 *   ├─ Pressure      read + notify   uint16 little-endian, raw sensor units
 *   ├─ Identify      write           any value: the seat blinks its light fast for a few seconds
 *   └─ Caregivers    write + notify  write uint8: 1 = this phone is near the seat, 0 = it isn't
 *                                    notify uint8: how many *other* connected phones are near
 *
 * The temperature encoding is the same one the Bluetooth SIG uses for its
 * Temperature characteristic (0x2A6E), so 2350 means 23.50 °C.
 *
 * Pressure is passed through unchanged (e.g. a 12-bit ADC reading from a
 * force-sensitive resistor, 0–4095). The app decides "occupied" by comparing it
 * with the pressure threshold in Settings, so the units only need to be
 * consistent between the firmware and that setting.
 *
 * Identify lets setup confirm it found the right seat: the app writes to it
 * and asks the user whether the seat's light is blinking. Firmware from
 * before Identify existed doesn't have it, and the write fails.
 *
 * Caregivers lets every caregiver's phone know whether someone else is with
 * the seat, so "too far away" only fires once nobody is. Each phone writes
 * whether it's within its distance limit; a 1 counts for NEARBY_FOR_MS, so the
 * app writes it again while it stays near, and a phone whose app stopped
 * running drops out by itself. The seat notifies each phone, about once a
 * second, how many of the others are near. Seats from before Caregivers don't
 * have it, and then the app works as if no one else were around.
 */

export const CAR_SEAT_SERVICE_UUID = 'c5a10001-7b3e-4f2d-9e61-2b8d4a0f5c10';
export const TEMPERATURE_CHAR_UUID = 'c5a10002-7b3e-4f2d-9e61-2b8d4a0f5c10';
export const PRESSURE_CHAR_UUID = 'c5a10003-7b3e-4f2d-9e61-2b8d4a0f5c10';
export const IDENTIFY_CHAR_UUID = 'c5a10004-7b3e-4f2d-9e61-2b8d4a0f5c10';
export const CAREGIVERS_CHAR_UUID = 'c5a10005-7b3e-4f2d-9e61-2b8d4a0f5c10';

/** What the app writes to the Identify characteristic. The firmware ignores the value. */
export const IDENTIFY_COMMAND = [0x01];

/** How long the seat counts a phone as near after it last wrote a 1 to Caregivers. */
export const NEARBY_FOR_MS = 6_000;

/** Advertised local name. Used as a fallback when the service UUID isn't in the advertisement. */
export const DEVICE_NAME = 'CarSeatSensor';

/** Decodes the temperature characteristic. Returns null for malformed packets. */
export function parseTemperatureC(bytes: readonly number[]): number | null {
  if (bytes.length < 2) return null;
  const raw = (bytes[0] & 0xff) | ((bytes[1] & 0xff) << 8);
  const signed = raw & 0x8000 ? raw - 0x10000 : raw;
  // 0x8000 is the SIG "value not known" sentinel.
  if (signed === -0x8000) return null;
  return signed / 100;
}

/** Decodes the pressure characteristic. Returns null for malformed packets. */
export function parsePressure(bytes: readonly number[]): number | null {
  if (bytes.length < 2) return null;
  return (bytes[0] & 0xff) | ((bytes[1] & 0xff) << 8);
}

/** What the app writes to the Caregivers characteristic. */
export function encodeNearby(near: boolean): number[] {
  return [near ? 0x01 : 0x00];
}

/** Decodes a Caregivers notification: how many other phones are near the seat. Null if malformed. */
export function parseOthersNearby(bytes: readonly number[]): number | null {
  if (bytes.length < 1) return null;
  return bytes[0] & 0xff;
}

/** Compares UUIDs regardless of case (iOS reports them upper-case). */
export function sameUuid(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
