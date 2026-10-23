import type { EventSubscription } from 'react-native';
import BleManager, {
  BleState,
  type BleManagerDidUpdateValueForCharacteristicEvent,
  type Peripheral,
} from 'react-native-ble-manager';

import { strings } from '../i18n/i18n';
import {
  CAREGIVERS_CHAR_UUID,
  CAR_SEAT_SERVICE_UUID,
  DEVICE_NAME,
  IDENTIFY_CHAR_UUID,
  IDENTIFY_COMMAND,
  NEARBY_FOR_MS,
  PRESSURE_CHAR_UUID,
  TEMPERATURE_CHAR_UUID,
  encodeNearby,
  parseOthersNearby,
  parsePressure,
  parseTemperatureC,
  sameUuid,
} from './protocol';
import {
  TransportEmitter,
  type BluetoothAccess,
  type CarSeatTransport,
  type TransportListener,
} from './transport';

const SCAN_SECONDS = 10;
const CONNECT_TIMEOUT_MS = 10_000;
const RSSI_POLL_MS = 1_000;
const RECONNECT_RETRY_MS = 3_000;
/** "Still near" is written this often, well inside the seat's NEARBY_FOR_MS. */
const NEARBY_REFRESH_MS = NEARBY_FOR_MS / 3;
/**
 * Turns on CoreBluetooth state restoration: if iOS ends the app while a seat
 * is connected or being waited for, it keeps the link (or the request) and
 * relaunches the app in the background when the seat sends data, drops or
 * comes into range. Never change it, or that is lost for apps already installed.
 */
const RESTORE_IDENTIFIER = 'seat-watcher-seats';

// CoreBluetooth has one scan at a time for the whole app, so seats take turns.
let scanQueue: Promise<unknown> = Promise.resolve();
function exclusiveScan<T>(run: () => Promise<T>): Promise<T> {
  const result = scanQueue.then(run, run);
  scanQueue = result.catch(() => {});
  return result;
}

export interface BleTransportOptions {
  /** The hardware this seat paired with, read on every connect. Null to find a new one. */
  getDeviceId?: () => string | null;
  /** The name it advertised when paired, shown while connecting. */
  getDeviceName?: () => string | null;
  /** Hardware not to pair with: other seats' and any the user said wasn't theirs. */
  getSkippedDeviceIds?: () => readonly string[];
}

let started: Promise<void> | null = null;
function ensureManagerStarted(): Promise<void> {
  started ??= BleManager.start({ showAlert: false, restoreIdentifierKey: RESTORE_IDENTIFIER }).catch((e) => {
    started = null;
    throw e;
  });
  return started;
}

/** Talks to the real car-seat hardware through CoreBluetooth. */
export class BleCarSeatTransport implements CarSeatTransport {
  readonly kind = 'ble';

  private emitter = new TransportEmitter();
  private nativeSubs: EventSubscription[];
  private peripheralId: string | null = null;
  private deviceName: string | undefined;
  /** What the user asked for. A disconnect while this is true is unexpected. */
  private wantConnected = false;
  /** Bumped on every connect/disconnect so stale async work can tell it's been superseded. */
  private session = 0;
  private rssiTimer: ReturnType<typeof setInterval> | undefined;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private lastRssiReadAt = 0;
  private rssiInFlight = false;
  /** True only while this transport's own scan runs (not while it waits for another's). */
  private scanActive = false;
  /** Whether this phone is near the seat, as the monitor last said (see reportNearby). */
  private nearby = false;
  private lastNearbyWriteAt = 0;
  /** Whether the connected seat has the Caregivers characteristic (older firmware doesn't). */
  private seatCountsCaregivers = false;

  constructor(private options: BleTransportOptions = {}) {
    this.nativeSubs = [
      BleManager.onDisconnectPeripheral((e) => this.handleDisconnect(e.peripheral)),
      BleManager.onDidUpdateValueForCharacteristic((e) => this.handleValue(e)),
      BleManager.onDidUpdateState((e) => this.handleBluetoothState(e.state)),
    ];
    // After a relaunch for Bluetooth, iOS hands the seats' links back only
    // once the manager starts, and gives the app about 10 seconds. So start
    // it now rather than at connect(), which waits for the account to load.
    // Only for a paired seat: then Bluetooth was allowed and there's no prompt.
    if (options.getDeviceId?.()) ensureManagerStarted().catch(() => {});
  }

  subscribe(listener: TransportListener): () => void {
    return this.emitter.subscribe(listener);
  }

  async connect(): Promise<void> {
    if (this.wantConnected) return;
    this.wantConnected = true;
    const session = ++this.session;

    try {
      await ensureManagerStarted();
      const paired = this.options.getDeviceId?.() ?? null;
      if (paired) {
        // A seat that's been paired: connect to that hardware directly, no
        // scan, and keep at it while the seat is out of range.
        this.peripheralId = paired;
        this.deviceName = this.options.getDeviceName?.() ?? DEVICE_NAME;
        await this.connectWhenReachable(session);
        return;
      }
      await requireBluetoothOn();
      this.emitter.setStatus('scanning');
      const peripheral = await exclusiveScan(() =>
        session === this.session ? this.scanForCarSeat() : Promise.reject(new Error('Cancelled.')),
      );
      if (session !== this.session) return;
      const id = peripheral.id;
      this.peripheralId = id;
      this.deviceName = peripheral.advertising?.localName ?? peripheral.name ?? DEVICE_NAME;
      this.emitter.setStatus('connecting', this.deviceName);
      // iOS connection attempts never time out on their own.
      await withTimeout(
        BleManager.connect(id),
        CONNECT_TIMEOUT_MS,
        strings().ble.tooSlow,
      );
      if (session !== this.session) return;
      await this.startSession(id);
      this.emitter.emit({ type: 'device', id, name: this.deviceName ?? DEVICE_NAME });
    } catch (e) {
      if (session !== this.session) return; // cancelled by disconnect()
      this.fail(e);
    }
  }

  async disconnect(): Promise<void> {
    this.wantConnected = false;
    this.session++;
    clearTimeout(this.reconnectTimer);
    this.stopRssiPolling();
    if (this.scanActive) await BleManager.stopScan().catch(() => {});
    // Also cancels a pending (re)connect request.
    if (this.peripheralId) await BleManager.disconnect(this.peripheralId).catch(() => {});
    this.emitter.setStatus('idle');
  }

  async identify(): Promise<void> {
    if (!this.peripheralId || this.emitter.status !== 'connected') {
      throw new Error(strings().ble.notConnected);
    }
    await BleManager.write(this.peripheralId, CAR_SEAT_SERVICE_UUID, IDENTIFY_CHAR_UUID, IDENTIFY_COMMAND);
  }

  reportNearby(near: boolean): void {
    this.nearby = near;
    this.writeNearby();
  }

  dispose(): void {
    void this.disconnect();
    this.nativeSubs.forEach((s) => s.remove());
    this.emitter.clear();
  }

  /** Gives up: back to 'idle', saying why. */
  private fail(e: unknown): void {
    this.wantConnected = false;
    this.session++;
    if (this.peripheralId) BleManager.disconnect(this.peripheralId).catch(() => {});
    this.emitter.emit({ type: 'error', message: errorMessage(e) });
    this.emitter.setStatus('idle');
  }

  /**
   * Connects to the paired seat whenever it can be reached. While it's out of
   * range, iOS keeps the request open, even in the background, so the phone
   * connects by itself as it gets close. Gives up only if Bluetooth can't be
   * used at all.
   */
  private async connectWhenReachable(session: number): Promise<void> {
    try {
      const state = await settledState(6_000);
      if (session !== this.session) return;
      if (state === BleState.Unauthorized || state === BleState.Unsupported) {
        this.fail(bluetoothProblem(state));
        return;
      }
      if (state !== BleState.On) {
        // handleBluetoothState starts the connection when Bluetooth comes on.
        if (state === BleState.Off) {
          this.emitter.emit({ type: 'error', message: strings().ble.offWillConnect });
        }
        this.emitter.setStatus('waiting', this.deviceName);
        return;
      }
      this.emitter.setStatus('connecting', this.deviceName);
      // A seat in range connects within a second or two. If it hasn't by now,
      // it's out of range or switched off, so say we're waiting for it.
      setTimeout(() => {
        if (session === this.session && this.emitter.status === 'connecting') {
          this.emitter.setStatus('waiting', this.deviceName);
        }
      }, CONNECT_TIMEOUT_MS);
      await this.keepConnecting(session);
    } catch (e) {
      if (session === this.session) this.fail(e);
    }
  }

  private scanForCarSeat(): Promise<Peripheral> {
    const skipped = this.options.getSkippedDeviceIds?.() ?? [];
    this.scanActive = true;
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (settle: () => void) => {
        if (done) return;
        done = true;
        this.scanActive = false;
        discoverSub.remove();
        stopSub.remove();
        settle();
      };
      const discoverSub = BleManager.onDiscoverPeripheral((p) => {
        if (!isCarSeat(p) || skipped.includes(p.id)) return;
        finish(() => {
          BleManager.stopScan().catch(() => {});
          resolve(p);
        });
      });
      const stopSub = BleManager.onStopScan(() =>
        finish(() =>
          reject(new Error(strings().ble.notFound)),
        ),
      );
      BleManager.scan({ seconds: SCAN_SECONDS }).catch((e) => finish(() => reject(e)));
    });
  }

  /** Discovers services, subscribes to readings, and starts RSSI polling. */
  private async startSession(id: string): Promise<void> {
    const info = await BleManager.retrieveServices(id, [CAR_SEAT_SERVICE_UUID]);
    await BleManager.startNotification(id, CAR_SEAT_SERVICE_UUID, TEMPERATURE_CHAR_UUID);
    await BleManager.startNotification(id, CAR_SEAT_SERVICE_UUID, PRESSURE_CHAR_UUID);
    this.seatCountsCaregivers = !!info.characteristics?.some((c) => sameUuid(c.characteristic, CAREGIVERS_CHAR_UUID));
    if (this.seatCountsCaregivers) {
      await BleManager.startNotification(id, CAR_SEAT_SERVICE_UUID, CAREGIVERS_CHAR_UUID).catch(() => {
        this.seatCountsCaregivers = false;
      });
    }
    this.emitter.setStatus('connected', this.deviceName);
    this.startRssiPolling();
    // The seat starts every connection at "not near", and a relaunched app may
    // have left a 1 behind on a link iOS kept, so say where we stand now.
    this.writeNearby();

    // Read once so the screen isn't blank until the first notification arrives.
    for (const uuid of [TEMPERATURE_CHAR_UUID, PRESSURE_CHAR_UUID]) {
      BleManager.read(id, CAR_SEAT_SERVICE_UUID, uuid)
        .then((value) => {
          if (this.emitter.status === 'connected') this.emitReading(uuid, value);
        })
        .catch(() => {}); // the characteristic may be notify-only
    }
  }

  private handleValue(e: BleManagerDidUpdateValueForCharacteristicEvent): void {
    if (e.peripheral !== this.peripheralId) return;
    this.emitReading(e.characteristic, e.value);
    // In the background iOS may pause JS timers, but it does wake the app for
    // notifications, so piggyback RSSI reads and "still near" on incoming data too.
    this.maybeReadRssi();
    if (this.nearby && Date.now() - this.lastNearbyWriteAt >= NEARBY_REFRESH_MS) this.writeNearby();
  }

  private emitReading(characteristic: string, value: number[]): void {
    if (sameUuid(characteristic, TEMPERATURE_CHAR_UUID)) {
      const celsius = parseTemperatureC(value);
      if (celsius !== null) this.emitter.emit({ type: 'temperature', celsius });
    } else if (sameUuid(characteristic, PRESSURE_CHAR_UUID)) {
      const pressure = parsePressure(value);
      if (pressure !== null) this.emitter.emit({ type: 'pressure', value: pressure });
    } else if (sameUuid(characteristic, CAREGIVERS_CHAR_UUID)) {
      const othersNearby = parseOthersNearby(value);
      if (othersNearby !== null) this.emitter.emit({ type: 'caregivers', othersNearby });
    }
  }

  /**
   * Tells the seat whether this phone is near it. A failed write needs no
   * retry: while near, it's written again every NEARBY_REFRESH_MS anyway, and
   * the seat stops counting a phone NEARBY_FOR_MS after its last 1, so a lost
   * 0 holds off the other phones' alerts for at most that long.
   */
  private writeNearby(): void {
    const id = this.peripheralId;
    if (!id || !this.seatCountsCaregivers || this.emitter.status !== 'connected') return;
    this.lastNearbyWriteAt = Date.now();
    BleManager.write(id, CAR_SEAT_SERVICE_UUID, CAREGIVERS_CHAR_UUID, encodeNearby(this.nearby)).catch(() => {});
  }

  private handleDisconnect(id: string): void {
    if (id !== this.peripheralId) return;
    this.stopRssiPolling();
    if (!this.wantConnected) {
      this.emitter.setStatus('idle');
      return;
    }
    // Only a drop from an established link counts as "lost". Drops during the
    // initial connect are reported by connect(), and drops while waiting or
    // reconnecting are retried by keepConnecting().
    if (this.emitter.status !== 'connected') return;
    this.emitter.setStatus('reconnecting', this.deviceName);
    void this.keepConnecting(this.session);
  }

  private handleBluetoothState(state: BleState): void {
    if (!this.wantConnected) return;
    if (state === BleState.Off) {
      this.emitter.emit({ type: 'error', message: strings().ble.offReconnect });
    } else if (state === BleState.On) {
      // Connect requests made while Bluetooth was off are silently dropped by
      // iOS, so abandon that attempt and start a fresh one.
      if (this.emitter.status === 'reconnecting') {
        clearTimeout(this.reconnectTimer);
        void this.keepConnecting(++this.session);
      } else if (this.emitter.status === 'waiting') {
        clearTimeout(this.reconnectTimer);
        void this.connectWhenReachable(++this.session);
      }
    }
  }

  /** Connects and starts the session, retrying until that works or a newer session takes over. */
  private async keepConnecting(session: number): Promise<void> {
    const id = this.peripheralId;
    if (!id) return;
    try {
      // When iOS relaunched the app for the seat, it may already be
      // connected; then go straight to subscribing. Otherwise, without a
      // timeout, iOS keeps this request pending (even in the background) and
      // completes it as soon as the seat is in range.
      if (!(await BleManager.isPeripheralConnected(id).catch(() => false))) await BleManager.connect(id);
      if (session !== this.session) return;
      await this.startSession(id);
      this.emitter.emit({ type: 'device', id, name: this.deviceName ?? DEVICE_NAME });
    } catch (e) {
      if (session !== this.session) return;
      // iOS no longer knows this seat (it can forget after a Bluetooth or
      // network settings reset), so waiting won't help; pairing again will.
      // Not while reconnecting: that must keep its Lost touch alert going.
      if (this.emitter.status !== 'reconnecting' && errorMessage(e).startsWith('Could not find peripheral')) {
        this.fail(strings().ble.lostTrack);
        return;
      }
      this.reconnectTimer = setTimeout(() => void this.keepConnecting(session), RECONNECT_RETRY_MS);
    }
  }

  private startRssiPolling(): void {
    this.stopRssiPolling();
    this.rssiTimer = setInterval(() => this.maybeReadRssi(), RSSI_POLL_MS);
  }

  private stopRssiPolling(): void {
    clearInterval(this.rssiTimer);
    this.rssiTimer = undefined;
  }

  private maybeReadRssi(): void {
    const id = this.peripheralId;
    if (!id || this.emitter.status !== 'connected' || this.rssiInFlight) return;
    if (Date.now() - this.lastRssiReadAt < RSSI_POLL_MS * 0.8) return;
    this.rssiInFlight = true;
    this.lastRssiReadAt = Date.now();
    BleManager.readRSSI(id)
      .then((dbm) => {
        // CoreBluetooth reports 127 when RSSI isn't available.
        if (dbm < 0) this.emitter.emit({ type: 'rssi', dbm });
      })
      .catch(() => {})
      .finally(() => {
        this.rssiInFlight = false;
      });
  }
}

function isCarSeat(p: Peripheral): boolean {
  const advertisesService = p.advertising?.serviceUUIDs?.some((u) =>
    sameUuid(u, CAR_SEAT_SERVICE_UUID),
  );
  return !!advertisesService || p.name === DEVICE_NAME || p.advertising?.localName === DEVICE_NAME;
}

/**
 * Starts CoreBluetooth, which shows the iOS Bluetooth prompt if it hasn't
 * been answered yet, and waits for the answer.
 */
export async function requestBluetoothAccess(): Promise<BluetoothAccess> {
  await ensureManagerStarted();
  // Give the user time to read the prompt.
  switch (await settledState(60_000)) {
    case BleState.On:
      return 'allowed';
    case BleState.Off:
      return 'off';
    case BleState.Unauthorized:
      return 'denied';
    default:
      return 'unavailable';
  }
}

/** Right after start(), or while the permission prompt is up, iOS reports "unknown". */
async function settledState(maxWaitMs: number): Promise<BleState> {
  let state = await BleManager.checkState();
  for (let waited = 0; waited < maxWaitMs && (state === BleState.Unknown || state === BleState.Resetting); waited += 300) {
    await new Promise((r) => setTimeout(r, 300));
    state = await BleManager.checkState();
  }
  return state;
}

async function requireBluetoothOn(): Promise<void> {
  const problem = bluetoothProblem(await settledState(6_000));
  if (problem) throw new Error(problem);
}

/** Why Bluetooth can't be used in this state, or null if it can. */
function bluetoothProblem(state: BleState): string | null {
  const t = strings().ble;
  switch (state) {
    case BleState.On:
      return null;
    case BleState.Off:
      return t.off;
    case BleState.Unauthorized:
      return t.denied;
    case BleState.Unsupported:
      return t.unsupported;
    default:
      return t.notReady;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === 'string' ? e : strings().ble.general;
}
