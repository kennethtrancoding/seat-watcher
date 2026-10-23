import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import type { AlertKind, OccupancyChange } from './AlertEngine';
import type { AlertMessage } from './messages';

/** Everything the monitor posts: alerts, and news that a seat was filled or emptied. */
export type NotificationKind = AlertKind | OccupancyChange;

const isOccupancyChange = (kind: NotificationKind): kind is OccupancyChange =>
  kind === 'seatOccupied' || kind === 'seatEmptied';

export interface Notifier {
  /** `seatId` keeps each seat's notifications apart in Notification Center. */
  notify(kind: NotificationKind, message: AlertMessage, seatId: string): Promise<void>;
}

/**
 * Whether this build carries Apple's Critical Alerts entitlement, so it can ask
 * for alerts that ring through Silent mode and Focus. Set by
 * app.json › expo.extra.criticalAlerts, which plugins/withCriticalAlerts.js
 * also reads to add the entitlement.
 */
export const CRITICAL_ALERTS_BUILD = Constants.expoConfig?.extra?.criticalAlerts === true;

/**
 * Whether alerts ring through Silent mode and Focus.
 * - 'on' / 'off': the user's answer, or the Critical Alerts switch in Settings › Notifications.
 * - 'notAsked': this build can send them, but the user hasn't been asked yet.
 * - 'unavailable': this build can't send them.
 */
export type CriticalAlertAccess = 'on' | 'off' | 'notAsked' | 'unavailable';

export interface NotificationAccess {
  allowed: boolean;
  criticalAlerts: CriticalAlertAccess;
}

function toAccess(permissions: Notifications.NotificationPermissionsStatus): NotificationAccess {
  // iOS reports an option the app hasn't asked for as unsupported (null).
  const critical = permissions.ios?.allowsCriticalAlerts;
  return {
    allowed: permissions.granted,
    criticalAlerts:
      critical === true ? 'on' : critical === false ? 'off' : CRITICAL_ALERTS_BUILD ? 'notAsked' : 'unavailable',
  };
}

let configured = false;

/** Call once at startup: shows alerts as banners even while the app is open. */
export function configureNotifications(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Reads the permission without asking. */
export async function getNotificationAccess(): Promise<NotificationAccess> {
  return toAccess(await Notifications.getPermissionsAsync());
}

/**
 * Shows the iOS prompts the user hasn't answered yet: notifications, then, in a
 * build with the entitlement, critical alerts. Afterwards resolves to the earlier answers.
 */
export async function requestNotificationAccess(): Promise<NotificationAccess> {
  const current = await getNotificationAccess();
  // Critical alerts have a prompt of their own, so someone who allowed
  // notifications in a build without them still gets asked.
  if (current.allowed && current.criticalAlerts !== 'notAsked') return current;
  return toAccess(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false, allowCriticalAlerts: CRITICAL_ALERTS_BUILD },
    }),
  );
}

/** A seat being filled or emptied isn't urgent, so it respects Silent mode and Focus. */
const NEWS_DELIVERY = { sound: 'default', interruptionLevel: 'active' } as const;

/**
 * How a safety alert is delivered: as a critical alert, which rings through
 * Silent mode and Focus, once the user has allowed those. Otherwise it's time
 * sensitive, which only breaks through Focus once the app has the Time
 * Sensitive Notifications capability; without it iOS delivers a normal notification.
 */
async function alertDelivery() {
  // Read every time: Critical Alerts can be switched off in Settings while the app runs in the background.
  const access = await getNotificationAccess().catch(() => null);
  return access?.criticalAlerts === 'on'
    ? ({ sound: 'defaultCritical', interruptionLevel: 'critical' } as const)
    : ({ sound: 'default', interruptionLevel: 'timeSensitive' } as const);
}

const PRACTICE_ID = 'car-seat-practice';

/** The practice alert from setup: a real notification, delivered the same way as alerts. */
export async function sendPracticeAlert({ title, body }: AlertMessage): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: PRACTICE_ID,
    content: { title, body, ...(await alertDelivery()) },
    trigger: null,
  });
}

export async function clearPracticeAlert(): Promise<void> {
  await Notifications.dismissNotificationAsync(PRACTICE_ID).catch(() => {});
}

/** Removes every alert this app has posted from Notification Center (factory reset). */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync().catch(() => {});
}

/** Posts an immediate iOS local notification. */
export const localNotifier: Notifier = {
  async notify(kind, { title, body }, seatId) {
    const occupancy = isOccupancyChange(kind);
    const delivery = occupancy ? NEWS_DELIVERY : await alertDelivery();
    await Notifications.scheduleNotificationAsync({
      // Reusing the seat and kind as the identifier replaces that seat's previous
      // notification of the same kind in Notification Center instead of stacking copies.
      // "In the seat" and "empty" share one, so only the latest of the two stays.
      identifier: `car-seat-${seatId}-${occupancy ? 'occupancy' : kind}`,
      content: { title, body, ...delivery, data: { kind, seatId } },
      trigger: null,
    });
  },
};
