import { router, useLocalSearchParams } from 'expo-router';

import { SeatPairing } from '../../seats/SeatPairing';

/** Pairs a seat with its hardware: from a new seat, or "Pair with a different seat". */
export default function PairSeatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SeatPairing seatId={id} onDone={() => router.back()} />;
}
