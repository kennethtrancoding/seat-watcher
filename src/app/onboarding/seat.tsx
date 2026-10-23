import { useEffect } from "react";

import { useMonitor } from "../../monitor/MonitorProvider";
import { useOnboarding } from "../../onboarding/OnboardingProvider";
import { SeatPairing } from "../../seats/SeatPairing";

/** Setup's seat step: pairs the first seat. More can be added from the home screen later. */
export default function SeatScreen() {
	const { seats, addSeat } = useMonitor();
	const { goNext } = useOnboarding();
	const first = seats[0];

	// Normally the child step made it; if that step is turned off, make it here.
	useEffect(() => {
		if (!first) void addSeat();
	}, [first, addSeat]);

	if (!first) return null;
	return <SeatPairing seatId={first.id} step="seat" onDone={() => goNext("seat")} />;
}
