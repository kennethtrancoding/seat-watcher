/**
 * Proximity estimation, isolated so it can be swapped out.
 *
 * BLE can't measure distance. RSSI (received signal strength) falls off
 * roughly with distance, but it also swings by 10 dB or more depending on
 * whether the phone is in a pocket, which way it faces, and what's in between.
 * Treat every number from here as a rough guess: fine for "the phone is
 * probably walking away from the car", not for "the phone is 4.2 m away".
 *
 * To try a different approach (Kalman filter, UWB, trained model...), implement
 * `ProximityEstimator` and pass a factory to `CarSeatMonitor`.
 */

export interface ProximityEstimate {
  /** Smoothed RSSI in dBm. */
  rssi: number;
  /** Rough distance estimate in metres. */
  distanceMeters: number;
  /** Debounced decision: has the phone moved beyond the allowed distance? */
  isBeyond: boolean;
}

export interface ProximityEstimator {
  /** Feeds one RSSI sample (dBm). Returns the updated estimate. */
  addSample(rssi: number): ProximityEstimate;
  current(): ProximityEstimate | null;
  /** Forget history, e.g. after the link drops. */
  reset(): void;
}

export interface RssiProximityConfig {
  /** Distance beyond which the phone counts as "too far" (metres). */
  maxDistanceMeters: number;
  /** RSSI measured with the phone 1 m from the seat (dBm). Calibrate per device. */
  rssiAt1m: number;
  /** Path-loss exponent n: ~2 in open air, 2.5–4 with people and car bodies in the way. */
  pathLossExponent: number;
  /** Samples in the median filter. Default 5. */
  windowSize?: number;
  /** Consecutive "too far" estimates required before isBeyond turns on. Default 3. */
  samplesToTrip?: number;
  /** isBeyond turns off only once the estimate drops below max × this. Default 0.8. */
  clearRatio?: number;
}

/** Log-distance path-loss model: d = 10 ^ ((RSSI@1m − RSSI) / (10·n)). */
export function rssiToDistance(rssi: number, rssiAt1m: number, pathLossExponent: number): number {
  return 10 ** ((rssiAt1m - rssi) / (10 * pathLossExponent));
}

/**
 * Median-filtered RSSI → log-distance model → hysteresis.
 *
 * The median ignores one-off spikes, and the trip count plus the lower
 * clearing threshold stop the alert from flickering near the boundary.
 */
export class RssiProximityEstimator implements ProximityEstimator {
  private samples: number[] = [];
  private beyondStreak = 0;
  private beyond = false;
  private latest: ProximityEstimate | null = null;

  constructor(private config: RssiProximityConfig) {}

  addSample(rssi: number): ProximityEstimate {
    const { maxDistanceMeters, rssiAt1m, pathLossExponent } = this.config;
    const windowSize = this.config.windowSize ?? 5;
    const samplesToTrip = this.config.samplesToTrip ?? 3;
    const clearRatio = this.config.clearRatio ?? 0.8;

    this.samples.push(rssi);
    if (this.samples.length > windowSize) this.samples.shift();

    const smoothed = median(this.samples);
    const distanceMeters = rssiToDistance(smoothed, rssiAt1m, pathLossExponent);

    if (distanceMeters > maxDistanceMeters) {
      this.beyondStreak++;
      if (this.beyondStreak >= samplesToTrip) this.beyond = true;
    } else {
      this.beyondStreak = 0;
      if (distanceMeters < maxDistanceMeters * clearRatio) this.beyond = false;
    }

    this.latest = { rssi: smoothed, distanceMeters, isBeyond: this.beyond };
    return this.latest;
  }

  current(): ProximityEstimate | null {
    return this.latest;
  }

  reset(): void {
    this.samples = [];
    this.beyondStreak = 0;
    this.beyond = false;
    this.latest = null;
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
