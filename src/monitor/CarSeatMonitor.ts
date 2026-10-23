import { AlertEngine, OccupancyTracker, isSeatOccupied, type AlertKind } from '../alerts/AlertEngine';
import { alertMessage, occupancyMessage, type AlertMessage } from '../alerts/messages';
import type { NotificationKind, Notifier } from '../alerts/notifier';
import type { CarSeatTransport, LinkStatus, TransportEvent } from '../ble/transport';
import {
  RssiProximityEstimator,
  type ProximityEstimate,
  type ProximityEstimator,
} from '../proximity/ProximityEstimator';
import type { Settings } from '../settings/settings';

export interface MonitorState {
  source: CarSeatTransport['kind'];
  link: LinkStatus;
  deviceName: string | null;
  error: string | null;
  temperatureC: number | null;
  pressure: number | null;
  /** Last known occupancy. Kept while reconnecting so a lost link can still alert. */
  occupied: boolean;
  /** Latest raw RSSI sample (dBm). */
  rssi: number | null;
  proximity: ProximityEstimate | null;
  /**
   * How many other caregivers' phones the seat says are near it (0 if the seat
   * can't tell). Kept while reconnecting, so a lost link knows whether someone stayed.
   */
  othersNearby: number;
  activeAlerts: AlertKind[];
}

export interface CarSeatMonitorOptions {
  transport: CarSeatTransport;
  notifier: Notifier;
  settings: Settings;
  /** Which seat this watches; keeps its notifications apart from other seats'. */
  seatId?: string;
  /** The child in the seat, for the alert text. '' until named. */
  childName?: string;
  /** The account's name, for the "someone's in the seat" greeting. '' until named. */
  userName?: string;
  /** Swap in a different proximity strategy here. */
  createEstimator?: (settings: Settings) => ProximityEstimator;
  now?: () => number;
  /** How often alerts are re-checked when no data arrives (drives reminders). */
  tickMs?: number;
}

const defaultEstimator = (s: Settings): ProximityEstimator =>
  new RssiProximityEstimator({
    maxDistanceMeters: s.maxDistanceMeters,
    rssiAt1m: s.rssiAt1m,
    pathLossExponent: s.pathLossExponent,
  });

const EMPTY_READINGS = {
  temperatureC: null,
  pressure: null,
  occupied: false,
  rssi: null,
  proximity: null,
  othersNearby: 0,
} satisfies Partial<MonitorState>;

/**
 * Joins everything together: transport events → occupancy + proximity →
 * alert engine → notifications. Has no React or native dependencies, so it
 * can be tested with the simulated transport and a fake notifier.
 */
export class CarSeatMonitor {
  private state: MonitorState;
  private settings: Settings;
  private childName: string;
  private userName: string;
  private listeners = new Set<() => void>();
  private engine = new AlertEngine();
  private occupancy = new OccupancyTracker();
  /** What this phone last told the seat about being near it. */
  private reportedNear = false;
  private estimator: ProximityEstimator;
  private createEstimator: (settings: Settings) => ProximityEstimator;
  private unsubscribeTransport: () => void;
  private ticker: ReturnType<typeof setInterval>;
  private now: () => number;

  constructor(private options: CarSeatMonitorOptions) {
    this.settings = options.settings;
    this.childName = options.childName ?? '';
    this.userName = options.userName ?? '';
    this.now = options.now ?? Date.now;
    this.createEstimator = options.createEstimator ?? defaultEstimator;
    this.estimator = this.createEstimator(this.settings);
    this.state = {
      source: options.transport.kind,
      link: 'idle',
      deviceName: null,
      error: null,
      activeAlerts: [],
      ...EMPTY_READINGS,
    };
    this.unsubscribeTransport = options.transport.subscribe((e) => this.handle(e));
    this.ticker = setInterval(() => this.update({}), options.tickMs ?? 5_000);
  }

  getState = (): MonitorState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  connect(): Promise<void> {
    this.update({ error: null });
    return this.options.transport.connect();
  }

  disconnect(): Promise<void> {
    return this.options.transport.disconnect();
  }

  identify(): Promise<void> {
    return this.options.transport.identify();
  }

  updateSettings(settings: Settings): void {
    const prev = this.settings;
    this.settings = settings;
    const patch: Partial<MonitorState> = {
      occupied: this.occupancyFor(this.state.pressure),
    };
    if (
      settings.maxDistanceMeters !== prev.maxDistanceMeters ||
      settings.rssiAt1m !== prev.rssiAt1m ||
      settings.pathLossExponent !== prev.pathLossExponent
    ) {
      this.estimator = this.createEstimator(settings);
      patch.proximity = null;
    }
    this.update(patch);
  }

  /** For a renamed child: later alerts use the new name. */
  setChildName(childName: string): void {
    this.childName = childName;
  }

  /** For a renamed account: later greetings use the new name. */
  setUserName(userName: string): void {
    this.userName = userName;
  }

  dispose(): void {
    clearInterval(this.ticker);
    this.unsubscribeTransport();
    this.listeners.clear();
  }

  private handle(e: TransportEvent): void {
    switch (e.type) {
      case 'status': {
        const patch: Partial<MonitorState> = { link: e.status };
        if (e.deviceName) patch.deviceName = e.deviceName;
        // A fresh attempt, or success: an earlier error (e.g. Bluetooth was off) no longer applies.
        if (e.status === 'connecting' || e.status === 'connected') patch.error = null;
        if (e.status === 'connected') {
          // Fresh RSSI history after every (re)connect, and the seat sends a fresh count.
          this.estimator.reset();
          patch.proximity = null;
          patch.othersNearby = 0;
        }
        if (e.status === 'idle' || e.status === 'scanning') {
          // A deliberate disconnect or a new connection: old readings no longer apply.
          Object.assign(patch, EMPTY_READINGS);
          this.estimator.reset();
          this.engine.reset();
          this.occupancy.reset();
        }
        this.update(patch);
        break;
      }
      case 'error':
        this.update({ error: e.message });
        break;
      case 'temperature':
        this.update({ temperatureC: e.celsius });
        break;
      case 'pressure':
        this.update({ pressure: e.value, occupied: this.occupancyFor(e.value) });
        break;
      case 'rssi':
        this.update({ rssi: e.dbm, proximity: this.estimator.addSample(e.dbm) });
        break;
      case 'caregivers':
        this.update({ othersNearby: e.othersNearby });
        break;
      case 'device':
        break; // for pairing; MonitorService saves it on the seat
    }
  }

  private occupancyFor(pressure: number | null): boolean {
    return isSeatOccupied(pressure, this.settings.occupancyPressureThreshold);
  }

  /** Applies a change, re-checks alerts, notifies listeners once, then sends notifications. */
  private update(patch: Partial<MonitorState>): void {
    const next: MonitorState = { ...this.state, ...patch };
    const now = this.now();
    const { active, notify } = this.engine.evaluate(next, this.settings, now);
    next.activeAlerts = sameKinds(active, this.state.activeAlerts) ? this.state.activeAlerts : active;
    // Tracked even while the setting is off, so turning it on doesn't announce an old change.
    const fresh = next.link === 'connected' && next.pressure !== null;
    const occupancyChange = this.occupancy.observe(fresh ? next.occupied : null, now);
    // Only a phone that knows it's within the limit counts as a caregiver with the seat.
    const near = next.link === 'connected' && next.proximity !== null && !next.proximity.isBeyond;
    if (near !== this.reportedNear) {
      this.reportedNear = near;
      this.options.transport.reportNearby(near);
    }

    const changed = (Object.keys(next) as (keyof MonitorState)[]).some(
      (k) => next[k] !== this.state[k],
    );
    this.state = next;
    if (changed) this.listeners.forEach((l) => l());

    for (const kind of notify) this.post(kind, alertMessage(kind, next, this.settings, this.childName));
    if (occupancyChange && this.settings.notifyOccupancyChanges) {
      const hour = new Date(this.now()).getHours();
      this.post(occupancyChange, occupancyMessage(occupancyChange, this.childName, this.userName, hour));
    }
  }

  private post(kind: NotificationKind, message: AlertMessage): void {
    this.options.notifier
      .notify(kind, message, this.options.seatId ?? 'seat')
      .catch((err) => console.warn('Failed to post notification', err));
  }
}

function sameKinds(a: AlertKind[], b: AlertKind[]): boolean {
  return a.length === b.length && a.every((k, i) => k === b[i]);
}
