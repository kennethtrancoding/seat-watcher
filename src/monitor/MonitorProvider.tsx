import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import {
  clearAllNotifications,
  configureNotifications,
  getNotificationAccess,
  localNotifier,
  requestNotificationAccess,
  type CriticalAlertAccess,
  type NotificationAccess,
} from '../alerts/notifier';
import { phoneLanguages } from '../i18n/deviceLanguage';
import { resolveLanguage, setLanguage } from '../i18n/i18n';
import { useStrings } from '../i18n/useStrings';
import { deviceLocationProvider } from '../locate/deviceLocation';
import { SeatLocator, type SeatLocation } from '../locate/SeatLocator';
import { loadLastSeen, saveLastSeen } from '../locate/storage';
import { childPhotoExists, deleteChildPhoto } from '../onboarding/childPhoto';
import { isOwnSeat, newSeat, withSharedSeats, type Seat, type SharingTeam } from '../seats/seats';
import { loadSeats, saveSeats as persistSeats } from '../seats/storage';
import { DEFAULT_SETTINGS, type Settings } from '../settings/settings';
import { eraseAllStoredData, loadSettings, saveSettings as persistSettings } from '../settings/storage';
import { IDLE_SEAT, MonitorService, type SeatMonitorSnapshot } from './MonitorService';

/** What this phone can change about a seat. Whether it's shared is up to the teams you help (syncSharedSeats). */
type SeatChanges = Partial<Omit<Seat, 'id' | 'sharedBy'>>;

interface MonitorContextValue {
  settings: Settings;
  saveSettings(settings: Settings): Promise<void>;
  /** The seats this phone watches, your own and the ones shared with you, in the order they were added. */
  seats: Seat[];
  /** Live state for each seat, by seat ID. Use useSeat(id) for one seat. */
  seatStates: Readonly<Record<string, SeatMonitorSnapshot>>;
  /** Why monitoring can't run (e.g. no Bluetooth module in Expo Go). */
  unavailableReason: string | null;
  /** Adds a seat of your own. */
  addSeat(fields?: SeatChanges): Promise<Seat>;
  /** A shared seat keeps the name its owner gave it; everything else is this phone's to change. */
  updateSeat(seatId: string, changes: SeatChanges): Promise<void>;
  /**
   * Stops watching one of your own seats, forgets where it was and deletes
   * the child's photo. A seat shared with you can't be removed: it goes when
   * you leave the team that shares it.
   */
  removeSeat(seatId: string): Promise<void>;
  /**
   * Brings the seats shared with you in line with every team you help (see
   * withSharedSeats in seats.ts): adds newly shared ones, renames, and removes
   * the ones no longer shared, with their photos and locations. Your own
   * seats stay as they are. OnboardingProvider keeps it current.
   */
  syncSharedSeats(teams: readonly SharingTeam[]): Promise<void>;
  /** Connect and Disconnect are remembered on the seat (autoConnect), across launches. */
  connect(seatId: string): void;
  disconnect(seatId: string): void;
  connectAll(): void;
  /** For logging out: not remembered, so the seats connect again after logging back in. */
  disconnectAll(): void;
  /** Whether seats connect by themselves (see MonitorService). OnboardingProvider keeps it current. */
  setAutoConnect(enabled: boolean): void;
  /** Blinks the seat's light. See CarSeatTransport.identify. */
  identify(seatId: string): Promise<void>;
  /** The account's name, for the "someone's in the seat" greeting. OnboardingProvider keeps it current. */
  setUserName(userName: string): void;
  /** "That isn't my seat": disconnects and forgets its hardware, so the next connect looks for another. */
  forgetSeatHardware(seatId: string): Promise<void>;
  notificationsAllowed: boolean | null;
  /** Whether alerts ring through Silent mode and Focus. See CriticalAlertAccess. */
  criticalAlerts: CriticalAlertAccess | null;
  /** Shows the notification prompts not answered yet (after a screen explains why). */
  requestNotifications(): Promise<NotificationAccess>;
  /**
   * Disconnects, clears the app's notifications, erases everything saved on
   * the phone and goes back to no seats and the default settings. Use
   * useFactoryReset, which also resets setup and the account.
   */
  factoryReset(): Promise<void>;
  /**
   * Swaps in another account's seats and settings (or none, for a new
   * account): disconnects, clears notifications and last-seen locations, and
   * saves the new ones on the phone. Photos that are gone (after a factory
   * reset) are dropped. It isn't reported to the data handler.
   */
  replaceData(seats: readonly Seat[], settings: Settings): Promise<void>;
  /**
   * Called with every saved change to the seats or settings, so
   * OnboardingProvider can save them with the account too.
   */
  setDataHandler(handler: (seats: readonly Seat[], settings: Settings) => void): void;
}

const MonitorContext = createContext<MonitorContextValue | null>(null);

const NO_NOTIFICATIONS: NotificationAccess = { allowed: false, criticalAlerts: 'unavailable' };

/**
 * The monitoring service, and the bookkeeping it does between renders: saving
 * each seat's last-seen location, and the latest seat list. Made once per
 * provider, outside React.
 */
class MonitorStore {
  /** Where each seat was last seen, as saved. */
  private lastSeen: Record<string, SeatLocation> = {};
  /** The latest seats and settings, for callbacks that run later. */
  seats: readonly Seat[] = [];
  settings: Settings = DEFAULT_SETTINGS;
  /** Told about each saved change. Set by OnboardingProvider. */
  onDataChanged: (seats: readonly Seat[], settings: Settings) => void = () => {};
  /** Saves the hardware a seat paired with. Set by the provider. */
  private onPaired: (seatId: string, changes: SeatChanges) => void = () => {};

  readonly service = new MonitorService({
    notifier: localNotifier,
    createLocator: (seatId) =>
      new SeatLocator({
        provider: deviceLocationProvider,
        onChange: (location) => this.saveLocation(seatId, location),
      }),
    onPaired: (seatId, deviceId, deviceName) => this.onPaired(seatId, { deviceId, deviceName }),
  });

  /** What was loaded from the phone: brings the locations back into the service. */
  load(seats: readonly Seat[], lastSeen: Record<string, SeatLocation>): void {
    this.seats = seats;
    this.lastSeen = lastSeen;
    this.service.restoreLastSeen(lastSeen);
  }

  setSeats(seats: readonly Seat[]): void {
    this.seats = seats;
  }

  setSettings(settings: Settings): void {
    this.settings = settings;
  }

  setDataHandler(handler: (seats: readonly Seat[], settings: Settings) => void): void {
    this.onDataChanged = handler;
  }

  setPairedHandler(handler: (seatId: string, changes: SeatChanges) => void): void {
    this.onPaired = handler;
  }

  /** After the factory reset erased what was saved. */
  clear(): void {
    this.seats = [];
    this.lastSeen = {};
  }

  private saveLocation(seatId: string, location: SeatLocation | null): void {
    const next = { ...this.lastSeen };
    if (location) next[seatId] = location;
    else delete next[seatId];
    this.lastSeen = next;
    saveLastSeen(next).catch((err) => console.warn('Failed to save the seat location', err));
  }
}

/**
 * Shows the app in the language picked in Settings, or the phone's. Call it
 * before React renders with new settings, so no screen shows the old language.
 */
function applyLanguage(settings: Settings): void {
  setLanguage(resolveLanguage(settings.language, phoneLanguages()));
}

export function MonitorProvider({ children }: { children: ReactNode }) {
  const t = useStrings();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [seats, setSeats] = useState<Seat[] | null>(null);
  const [notificationAccess, setNotificationAccess] = useState<NotificationAccess | null>(null);
  const [store] = useState(() => new MonitorStore());
  const { service } = store;
  const snapshot = useSyncExternalStore(service.subscribe, service.getSnapshot);

  const refreshNotificationPermission = useCallback(() => {
    getNotificationAccess()
      .then(setNotificationAccess)
      .catch(() => setNotificationAccess(NO_NOTIFICATIONS));
  }, []);

  useEffect(() => {
    configureNotifications();
    // Only read it here: setup asks, on a screen that explains why first.
    refreshNotificationPermission();
    // Pick up a change made in the Settings app.
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      refreshNotificationPermission();
      // e.g. Bluetooth permission was just turned on in the Settings app.
      service.resume();
    });
    void Promise.all([loadSettings(), loadSeats(), loadLastSeen()]).then(([loadedSettings, loadedSeats, lastSeen]) => {
      // Restore before the settings are applied: if the feature is off, applying them clears it.
      store.load(loadedSeats, lastSeen);
      store.setSettings(loadedSettings);
      setSeats(loadedSeats);
      applyLanguage(loadedSettings);
      setSettings(loadedSettings);
    });
    return () => sub.remove();
  }, [store, service, refreshNotificationPermission]);

  useEffect(() => {
    if (settings && seats) service.apply(settings, seats);
  }, [service, settings, seats]);

  useEffect(() => () => service.dispose(), [service]);

  const saveSettings = useCallback(
    async (next: Settings) => {
      applyLanguage(next);
      store.setSettings(next);
      setSettings(next);
      store.onDataChanged(store.seats, next);
      await persistSettings(next);
    },
    [store],
  );

  const saveSeats = useCallback(
    async (next: Seat[]) => {
      store.setSeats(next);
      setSeats(next);
      store.onDataChanged(next, store.settings);
      await persistSeats(next);
    },
    [store],
  );

  const updateSeat = useCallback(
    (seatId: string, changes: SeatChanges) =>
      saveSeats(
        store.seats.map((s) =>
          s.id !== seatId ? s : { ...s, ...changes, childName: isOwnSeat(s) ? (changes.childName ?? s.childName) : s.childName },
        ),
      ),
    [store, saveSeats],
  );

  useEffect(() => {
    store.setPairedHandler((seatId, changes) => void updateSeat(seatId, changes));
  }, [store, updateSeat]);

  const addSeat = useCallback(
    async (fields: SeatChanges = {}) => {
      const seat = newSeat(fields);
      await saveSeats([...store.seats, seat]);
      return seat;
    },
    [store, saveSeats],
  );

  const removeSeat = useCallback(
    async (seatId: string) => {
      const seat = store.seats.find((s) => s.id === seatId);
      // Someone else's seat is theirs to remove.
      if (!seat || !isOwnSeat(seat)) return;
      deleteChildPhoto(seat.childPhotoUri);
      // Applying the shorter list stops watching it and forgets its location.
      await saveSeats(store.seats.filter((s) => s.id !== seatId));
    },
    [store, saveSeats],
  );

  const syncSharedSeats = useCallback(
    async (teams: readonly SharingTeam[]) => {
      const next = withSharedSeats(store.seats, teams);
      if (!next) return;
      // As with removeSeat, applying the list stops watching the ones that went.
      for (const seat of store.seats) if (!next.some((s) => s.id === seat.id)) deleteChildPhoto(seat.childPhotoUri);
      await saveSeats(next);
    },
    [store, saveSeats],
  );

  const forgetSeatHardware = useCallback(
    async (seatId: string) => {
      service.rejectDevice(seatId);
      await updateSeat(seatId, { deviceId: null, deviceName: null });
    },
    [service, updateSeat],
  );

  // Stable, so screens can use it in effect dependencies.
  const identify = useCallback((seatId: string) => service.identify(seatId), [service]);
  const setUserName = useCallback((userName: string) => service.setUserName(userName), [service]);
  const setAutoConnect = useCallback((enabled: boolean) => service.setAutoConnect(enabled), [service]);

  /** Saves whether these seats should connect by themselves, if that changed. */
  const rememberAutoConnect = useCallback(
    (seatIds: readonly string[], autoConnect: boolean) => {
      if (!store.seats.some((s) => seatIds.includes(s.id) && s.autoConnect !== autoConnect)) return;
      void saveSeats(store.seats.map((s) => (seatIds.includes(s.id) ? { ...s, autoConnect } : s)));
    },
    [store, saveSeats],
  );

  const factoryReset = useCallback(async () => {
    // Drops every monitor (and seat connection). Applying no seats below
    // forgets their locations too.
    service.dispose();
    await Promise.all([clearAllNotifications(), eraseAllStoredData()]);
    store.clear();
    setSeats([]);
    // A new object even if nothing changed, so the effect above re-applies it.
    const defaults = { ...DEFAULT_SETTINGS };
    store.setSettings(defaults);
    applyLanguage(defaults);
    setSettings(defaults);
  }, [store, service]);

  const replaceData = useCallback(
    async (nextSeats: readonly Seat[], nextSettings: Settings) => {
      service.dispose();
      const kept = nextSeats.map((s) =>
        s.childPhotoUri && !childPhotoExists(s.childPhotoUri) ? { ...s, childPhotoUri: '' } : s,
      );
      await Promise.all([clearAllNotifications(), persistSeats(kept), persistSettings(nextSettings), saveLastSeen({})]);
      store.clear();
      store.setSeats(kept);
      // A new object even if nothing changed, so the effect above re-applies it.
      const next = { ...nextSettings };
      store.setSettings(next);
      setSeats(kept);
      applyLanguage(next);
      setSettings(next);
    },
    [store, service],
  );

  const setDataHandler = useCallback(
    (handler: (seats: readonly Seat[], settings: Settings) => void) => store.setDataHandler(handler),
    [store],
  );

  const requestNotifications = useCallback(async () => {
    const access = await requestNotificationAccess().catch(() => NO_NOTIFICATIONS);
    setNotificationAccess(access);
    return access;
  }, []);

  if (!settings || !seats) return null; // loads from disk in a few milliseconds

  const value: MonitorContextValue = {
    settings,
    saveSettings,
    seats,
    seatStates: snapshot.seats,
    unavailableReason: snapshot.bluetoothUnavailable ? t.ble.unavailable : null,
    addSeat,
    updateSeat,
    removeSeat,
    syncSharedSeats,
    connect: (seatId) => {
      rememberAutoConnect([seatId], true);
      service.connect(seatId);
    },
    disconnect: (seatId) => {
      rememberAutoConnect([seatId], false);
      service.disconnect(seatId);
    },
    connectAll: () => {
      rememberAutoConnect(seats.map((s) => s.id), true);
      service.connectAll();
    },
    disconnectAll: () => service.disconnectAll(),
    setAutoConnect,
    identify,
    setUserName,
    forgetSeatHardware,
    notificationsAllowed: notificationAccess?.allowed ?? null,
    criticalAlerts: notificationAccess?.criticalAlerts ?? null,
    requestNotifications,
    factoryReset,
    replaceData,
    setDataHandler,
  };

  return <MonitorContext.Provider value={value}>{children}</MonitorContext.Provider>;
}

export function useMonitor(): MonitorContextValue {
  const value = useContext(MonitorContext);
  if (!value) throw new Error('useMonitor must be used inside <MonitorProvider>');
  return value;
}

/** One seat and its live state. `seat` is undefined if there's no seat with that ID (e.g. just removed). */
export function useSeat(seatId: string | undefined): SeatMonitorSnapshot & { seat: Seat | undefined } {
  const { seats, seatStates } = useMonitor();
  const seat = seats.find((s) => s.id === seatId);
  return { seat, ...(seatId ? (seatStates[seatId] ?? IDLE_SEAT) : IDLE_SEAT) };
}
