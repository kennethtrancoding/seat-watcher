import type { Notifier } from '../alerts/notifier';
import { SimulatedCarSeatTransport } from '../ble/SimulatedCarSeatTransport';
import type { CarSeatTransport } from '../ble/transport';
import { strings } from '../i18n/i18n';
import type { SeatLocation, SeatLocator } from '../locate/SeatLocator';
import { settingsForSeat, type Seat } from '../seats/seats';
import type { Settings } from '../settings/settings';
import { CarSeatMonitor, type MonitorState } from './CarSeatMonitor';
import { createTransport } from './createTransport';

/** Everything the screens show about one seat. */
export interface SeatMonitorSnapshot {
  state: MonitorState;
  /** Set while the simulated seat is active, for the simulator controls. */
  simulator: SimulatedCarSeatTransport | null;
  /** Where the seat was last seen, while "Remember where the seat was last seen" is on. */
  lastSeen: SeatLocation | null;
}

export interface MonitorSnapshot {
  /** One entry per seat, by seat ID. */
  seats: Readonly<Record<string, SeatMonitorSnapshot>>;
  /** True when this build can't use Bluetooth (Expo Go), so only the simulated seat works. */
  bluetoothUnavailable: boolean;
}

export const IDLE_STATE: MonitorState = {
  source: 'ble',
  link: 'idle',
  deviceName: null,
  error: null,
  temperatureC: null,
  pressure: null,
  occupied: false,
  rssi: null,
  proximity: null,
  othersNearby: 0,
  activeAlerts: [],
};

export const IDLE_SEAT: SeatMonitorSnapshot = { state: IDLE_STATE, simulator: null, lastSeen: null };

export interface MonitorServiceOptions {
  notifier: Notifier;
  /** Makes the "last seen" tracker for one seat. */
  createLocator: (seatId: string) => SeatLocator;
  /** A seat connected to hardware it hadn't paired with: save it on the seat. */
  onPaired?: (seatId: string, deviceId: string, deviceName: string) => void;
}

interface Watched {
  seat: Seat;
  monitor: CarSeatMonitor;
  transport: CarSeatTransport;
  /** The hardware it's connected to now, from the transport's 'device' event. */
  deviceId: string | null;
  unsubscribe: () => void;
}

/**
 * Watches every seat at once, each with its own transport and monitor, so two
 * children riding together are both covered. Rebuilds them all when the user
 * switches between real hardware and the simulator. React reads it through
 * useSyncExternalStore.
 *
 * Each seat's locator lives as long as the seat, across rebuilds, so its last
 * known location survives switching to the simulator and back.
 */
export class MonitorService {
  private watched = new Map<string, Watched>();
  private locators = new Map<string, SeatLocator>();
  private builtForSimulator: boolean | null = null;
  private bluetoothUnavailable = false;
  private restored: Record<string, SeatLocation> = {};
  /** The account's name, for every seat's greeting. */
  private userName = '';
  /** Hardware the user said wasn't theirs ("No, it isn't blinking"), skipped when pairing. */
  private rejected = new Set<string>();
  /** Whether seats connect without a tap. See setAutoConnect. */
  private autoConnect = false;
  private listeners = new Set<() => void>();
  private snapshot: MonitorSnapshot = { seats: {}, bluetoothUnavailable: false };

  constructor(private options: MonitorServiceOptions) {}

  getSnapshot = (): MonitorSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Brings back the locations saved by a previous run of the app, by seat ID. */
  restoreLastSeen(locations: Readonly<Record<string, SeatLocation>>): void {
    this.restored = { ...locations };
    for (const [id, location] of Object.entries(locations)) this.locators.get(id)?.restore(location);
    this.publish();
  }

  /**
   * Watches exactly these seats with these settings, adding, updating and
   * removing monitors to match. A seat shared with you is watched with its
   * owner's settings for it (settingsForSeat).
   */
  apply(settings: Settings, seats: readonly Seat[]): void {
    if (settings.useSimulator !== this.builtForSimulator) {
      this.stopWatchingAll();
      this.builtForSimulator = settings.useSimulator;
      this.bluetoothUnavailable = false;
    }
    const wanted = new Set(seats.map((s) => s.id));
    for (const id of [...this.locators.keys()]) if (!wanted.has(id)) this.forget(id);

    for (const seat of seats) {
      this.locatorFor(seat.id).setEnabled(settings.rememberSeatLocation);
      const watched = this.watched.get(seat.id);
      const seatSettings = settingsForSeat(settings, seat);
      if (watched) {
        watched.seat = seat;
        watched.monitor.setChildName(seat.childName);
        watched.monitor.updateSettings(seatSettings);
      } else {
        this.watch(seat, seatSettings);
      }
    }
    this.publish();
  }

  /** The account's name changed (or it logged in): every seat greets them by it. */
  setUserName(userName: string): void {
    this.userName = userName;
    for (const { monitor } of this.watched.values()) monitor.setUserName(userName);
  }

  /**
   * Turns connecting by itself on or off. While it's on, every paired seat the
   * user hasn't disconnected (every seat, with the simulator) connects without
   * a tap: now, and whenever it's rebuilt. One out of range waits ('waiting')
   * until the phone is close. Seats that were never paired are left alone,
   * because pairing checks it's the right seat. OnboardingProvider keeps it on
   * while setup is done and someone's logged in.
   *
   * Turning it off (logging out, Run setup again) disconnects every seat too,
   * without saving that on the seat: a phone nobody's logged in to mustn't
   * alert. Off while it's already off leaves seats alone, so pairing during
   * setup keeps its connection.
   */
  setAutoConnect(enabled: boolean): void {
    const wasOn = this.autoConnect;
    this.autoConnect = enabled;
    if (enabled) for (const watched of this.watched.values()) this.connectIfWanted(watched);
    else if (wasOn) this.disconnectAll();
  }

  /**
   * The app came back to the foreground: retries seats that stopped trying,
   * e.g. because Bluetooth permission was off.
   */
  resume(): void {
    if (this.autoConnect) for (const watched of this.watched.values()) this.connectIfWanted(watched);
  }

  connect(seatId: string): void {
    void this.watched.get(seatId)?.monitor.connect();
  }

  disconnect(seatId: string): void {
    void this.watched.get(seatId)?.monitor.disconnect();
  }

  /** Seats take turns scanning, so connecting them all at once is fine. */
  connectAll(): void {
    for (const { monitor } of this.watched.values()) void monitor.connect();
  }

  disconnectAll(): void {
    for (const { monitor } of this.watched.values()) void monitor.disconnect();
  }

  identify(seatId: string): Promise<void> {
    return this.watched.get(seatId)?.monitor.identify() ?? Promise.reject(new Error(strings().ble.notConnected));
  }

  /**
   * "That isn't my seat": disconnects, and won't pair this seat with that
   * hardware again until the app restarts. Also clear the seat's deviceId.
   */
  rejectDevice(seatId: string): void {
    const watched = this.watched.get(seatId);
    const id = watched?.deviceId ?? watched?.seat.deviceId;
    if (id) this.rejected.add(id);
    if (watched) watched.deviceId = null;
    this.disconnect(seatId);
  }

  dispose(): void {
    this.stopWatchingAll();
    this.builtForSimulator = null;
  }

  private watch(seat: Seat, settings: Settings): void {
    let transport: CarSeatTransport;
    try {
      transport = createTransport(settings.useSimulator, {
        getDeviceId: () => this.watched.get(seat.id)?.seat.deviceId ?? null,
        getDeviceName: () => this.watched.get(seat.id)?.seat.deviceName ?? null,
        getSkippedDeviceIds: () => this.skippedFor(seat.id),
      });
    } catch {
      this.bluetoothUnavailable = true;
      return;
    }
    const monitor = new CarSeatMonitor({
      transport,
      notifier: this.options.notifier,
      settings,
      seatId: seat.id,
      childName: seat.childName,
      userName: this.userName,
    });
    const watched: Watched = { seat, monitor, transport, deviceId: null, unsubscribe: () => {} };
    const offMonitor = monitor.subscribe(() => this.publish());
    const offDevice = transport.subscribe((e) => {
      if (e.type !== 'device') return;
      watched.deviceId = e.id;
      if (watched.seat.deviceId !== e.id) this.options.onPaired?.(seat.id, e.id, e.name);
    });
    watched.unsubscribe = () => {
      offMonitor();
      offDevice();
    };
    this.watched.set(seat.id, watched);
    this.connectIfWanted(watched);
  }

  private connectIfWanted({ seat, monitor }: Watched): void {
    const paired = this.builtForSimulator === true || seat.deviceId !== null;
    if (this.autoConnect && seat.autoConnect && paired && monitor.getState().link === 'idle') {
      void monitor.connect();
    }
  }

  /** Other seats' hardware, and anything rejected, so pairing finds a seat nobody has. */
  private skippedFor(seatId: string): string[] {
    const others: string[] = [];
    for (const w of this.watched.values()) {
      const id = w.seat.id === seatId ? null : (w.deviceId ?? w.seat.deviceId);
      if (id) others.push(id);
    }
    return [...others, ...this.rejected];
  }

  private locatorFor(seatId: string): SeatLocator {
    let locator = this.locators.get(seatId);
    if (!locator) {
      locator = this.options.createLocator(seatId);
      // Before it's turned on or off: if the feature is off, that clears it.
      locator.restore(this.restored[seatId] ?? null);
      locator.subscribe(() => this.publish());
      this.locators.set(seatId, locator);
    }
    return locator;
  }

  /** A removed seat: stop watching it and forget where it was. */
  private forget(seatId: string): void {
    this.stopWatching(seatId);
    this.locators.get(seatId)?.setEnabled(false);
    this.locators.delete(seatId);
    delete this.restored[seatId];
  }

  private stopWatching(seatId: string): void {
    const watched = this.watched.get(seatId);
    if (!watched) return;
    watched.unsubscribe();
    watched.monitor.dispose();
    watched.transport.dispose();
    this.watched.delete(seatId);
  }

  private stopWatchingAll(): void {
    for (const id of [...this.watched.keys()]) this.stopWatching(id);
  }

  private publish(): void {
    const seats: Record<string, SeatMonitorSnapshot> = {};
    for (const [id, locator] of this.locators) {
      const watched = this.watched.get(id);
      const state = watched?.monitor.getState() ?? IDLE_STATE;
      // Every monitor change passes through here, so this keeps the locator in
      // step with the link. It takes a fix when one is due.
      locator.observe(state.link);
      seats[id] = {
        state,
        simulator: watched?.transport instanceof SimulatedCarSeatTransport ? watched.transport : null,
        lastSeen: locator.getLastSeen(),
      };
    }
    this.snapshot = { seats, bluetoothUnavailable: this.bluetoothUnavailable };
    this.listeners.forEach((l) => l());
  }
}
