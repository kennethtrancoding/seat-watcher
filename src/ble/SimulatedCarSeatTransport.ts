import { strings } from '../i18n/i18n';
import { TransportEmitter, type CarSeatTransport, type TransportListener } from './transport';

/** What the simulated world looks like right now. Changed from the simulator panel. */
export interface SimulatorScene {
  temperatureC: number;
  occupied: boolean;
  /** Distance between the phone and the seat; converted to a noisy RSSI. */
  distanceMeters: number;
  /** Forces the link down, as if the seat lost power. */
  linkBlocked: boolean;
  /** Another caregiver's phone is near the seat, as the real seat would report. */
  someoneElseNearby: boolean;
}

const DEFAULT_SCENE: SimulatorScene = {
  temperatureC: 24,
  occupied: true,
  distanceMeters: 1,
  linkBlocked: false,
  someoneElseNearby: false,
};

/** Past this distance the simulated link drops, roughly like real BLE. */
export const SIMULATED_RANGE_METERS = 20;
const SIM_RSSI_AT_1M = -59;
const SIM_PATH_LOSS_EXPONENT = 2.5;
const OCCUPIED_PRESSURE = 1800;
const EMPTY_PRESSURE = 40;

/**
 * A fake car seat that behaves like a paired real seat: it goes through
 * scanning → connecting → connected, streams readings once a second, drops
 * into 'reconnecting' when the link breaks, and if it's out of reach when
 * asked to connect, waits ('waiting') and connects once it's back.
 */
export class SimulatedCarSeatTransport implements CarSeatTransport {
  readonly kind = 'simulator';

  private emitter = new TransportEmitter();
  private scene: SimulatorScene = { ...DEFAULT_SCENE };
  private wantConnected = false;
  private session = 0;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private options: { tickMs?: number; connectDelayMs?: number; random?: () => number } = {},
  ) {}

  subscribe(listener: TransportListener): () => void {
    return this.emitter.subscribe(listener);
  }

  getScene(): SimulatorScene {
    return { ...this.scene };
  }

  update(changes: Partial<SimulatorScene>): void {
    this.scene = { ...this.scene, ...changes };
    this.syncLink();
    if (this.emitter.status === 'connected') this.emitReadings();
  }

  async connect(): Promise<void> {
    if (this.wantConnected) return;
    this.wantConnected = true;
    const session = ++this.session;
    const delay = this.options.connectDelayMs ?? 700;

    this.emitter.setStatus('scanning');
    await sleep(delay);
    if (session !== this.session) return;
    this.emitter.setStatus('connecting', strings().ble.simulatedSeat);
    await sleep(delay / 2);
    if (session !== this.session) return;

    this.timer = setInterval(() => this.tick(), this.options.tickMs ?? 1_000);
    if (!this.linkUp()) {
      this.emitter.setStatus('waiting', strings().ble.simulatedSeat);
      return;
    }
    this.emitter.setStatus('connected', strings().ble.simulatedSeat);
    this.emitReadings();
  }

  async disconnect(): Promise<void> {
    this.wantConnected = false;
    this.session++;
    this.stopTimer();
    this.emitter.setStatus('idle');
  }

  /** The simulated seat has no light, so this only checks the link. */
  async identify(): Promise<void> {
    if (this.emitter.status !== 'connected') throw new Error(strings().ble.notConnected);
  }

  /** The simulated seat makes up the other caregivers itself (see SimulatorScene), so this changes nothing. */
  reportNearby(): void {}

  dispose(): void {
    void this.disconnect();
    this.emitter.clear();
  }

  private tick(): void {
    this.syncLink();
    if (this.emitter.status === 'connected') this.emitReadings();
  }

  private linkUp(): boolean {
    return !this.scene.linkBlocked && this.scene.distanceMeters <= SIMULATED_RANGE_METERS;
  }

  /** Moves between connected and reconnecting (or waiting) as the scene changes. */
  private syncLink(): void {
    if (!this.wantConnected) return;
    const status = this.emitter.status;
    if (status === 'connected' && !this.linkUp()) {
      this.emitter.setStatus('reconnecting', strings().ble.simulatedSeat);
    } else if ((status === 'reconnecting' || status === 'waiting') && this.linkUp()) {
      this.emitter.setStatus('connected', strings().ble.simulatedSeat);
    }
  }

  private emitReadings(): void {
    const noise = (amplitude: number) => ((this.options.random ?? Math.random)() * 2 - 1) * amplitude;
    const { temperatureC, occupied, distanceMeters } = this.scene;

    this.emitter.emit({ type: 'temperature', celsius: round(temperatureC + noise(0.05), 2) });
    this.emitter.emit({
      type: 'pressure',
      value: Math.round((occupied ? OCCUPIED_PRESSURE : EMPTY_PRESSURE) + noise(30)),
    });
    const rssi =
      SIM_RSSI_AT_1M - 10 * SIM_PATH_LOSS_EXPONENT * Math.log10(Math.max(distanceMeters, 0.1));
    this.emitter.emit({ type: 'rssi', dbm: Math.round(rssi + noise(3)) });
    this.emitter.emit({ type: 'caregivers', othersNearby: this.scene.someoneElseNearby ? 1 : 0 });
  }

  private stopTimer(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
