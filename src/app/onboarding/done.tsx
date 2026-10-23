import { seatStatus } from "../../alerts/messages";
import { SeatStatusCard } from "../../components/SeatStatusCard";
import { Button } from "../../components/ui";
import { useStrings } from "../../i18n/useStrings";
import { useMonitor } from "../../monitor/MonitorProvider";
import { useOnboarding } from "../../onboarding/OnboardingProvider";
import { OnboardingScreen } from "../../onboarding/OnboardingScreen";

export default function DoneScreen() {
	const { seats, seatStates } = useMonitor();
	const { complete } = useOnboarding();
	const t = useStrings().onboarding.done;
	const statuses = seats.map((seat) =>
		seatStatus(seatStates[seat.id]?.state ?? { link: "idle", activeAlerts: [] }, seat.childName),
	);
	return (
		<OnboardingScreen
			step="done"
			icon="checkmark.seal.fill"
			title={t.title}
			body={t.body}
			readAloud={statuses.map((s) => s.text).join(". ")}
			// Finishing swaps the setup screens for the main screen (see src/app/_layout.tsx).
			actions={<Button title={t.start} onPress={() => void complete()} />}>
			{seats.map((seat) => (
				<SeatStatusCard key={seat.id} seatId={seat.id} />
			))}
		</OnboardingScreen>
	);
}
