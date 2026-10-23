/**
 * A transport is anything that can deliver car-seat readings: the real BLE
 * device, or the simulator used for demos and the iOS Simulator (which has no
 * Bluetooth). The rest of the app only talks to this interface.
 */

export type LinkStatus =
  | 'idle' // not connected, not trying to connect
  | 'scanning'
  | 'connecting'
  // Waiting for a paired seat that's out of range (or for Bluetooth to come
  // on). iOS keeps the request open and connects as soon as the seat is close.
  | 'waiting'
  | 'connected'
  // The link dropped without the user asking for it and the transport is
  // waiting for the device to come back. This is what "connection lost" means.
  | 'reconnecting';

/** What came of asking for Bluetooth. 'off' means allowed, but switched off in Control Center. */
export type BluetoothAccess = 'allowed' | 'off' | 'denied' | 'unavailable';

export type TransportEvent =
  | { type: 'status'; status: LinkStatus; deviceName?: string }
  | { type: 'error'; message: string }
  | { type: 'temperature'; celsius: number }
  | { type: 'pressure'; value: number }
  | { type: 'rssi'; dbm: number }
  /** How many other caregivers' phones say they're near the seat. Only seats that can tell send it. */
  | { type: 'caregivers'; othersNearby: number }
  /** Connected to this hardware. A seat remembers it, so it reconnects to the same one next time. */
  | { type: 'device'; id: string; name: string };

export type TransportListener = (event: TransportEvent) => void;

export interface CarSeatTransport {
  readonly kind: 'ble' | 'simulator';
  /** Scan for the car seat, connect, and start streaming readings. */
  connect(): Promise<void>;
  /** User-initiated disconnect. Must end in 'idle', never 'reconnecting'. */
  disconnect(): Promise<void>;
  /**
   * Blinks the connected seat's light so the user can tell it's theirs.
   * Rejects when not connected, or when the seat's firmware can't blink.
   */
  identify(): Promise<void>;
  /**
   * Tells the seat whether this phone is within its distance limit, so other
   * caregivers' phones know someone is with the seat. Remembered across
   * reconnects; best effort, and ignored by seats that can't take it.
   */
  reportNearby(near: boolean): void;
  subscribe(listener: TransportListener): () => void;
  /** Disconnects and releases native listeners and timers. Not reusable afterwards. */
  dispose(): void;
}

/** Shared listener bookkeeping and status de-duplication for transports. */
export class TransportEmitter {
  private listeners = new Set<TransportListener>();
  status: LinkStatus = 'idle';

  subscribe(listener: TransportListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: TransportEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  setStatus(status: LinkStatus, deviceName?: string): void {
    if (status === this.status) return;
    this.status = status;
    this.emit({ type: 'status', status, deviceName });
  }

  clear(): void {
    this.listeners.clear();
  }
}
