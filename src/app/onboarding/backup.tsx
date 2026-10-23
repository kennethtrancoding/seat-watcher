import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { teamCounts } from "../../account/team";
import { useTeam } from "../../account/TeamProvider";
import { InviteButton } from "../../components/InviteButton";
import { TeamList } from "../../components/TeamList";
import { Button, Options, Text, colors } from "../../components/ui";
import { useStrings } from "../../i18n/useStrings";
import { useMonitor } from "../../monitor/MonitorProvider";
import { useOnboarding } from "../../onboarding/OnboardingProvider";
import { OnboardingScreen } from "../../onboarding/OnboardingScreen";

const WAIT_OPTIONS = [2, 5, 10];

/**
 * Invite the people who'll help watch the seats: they join the team and
 * become the backup if an alert goes unanswered. Each invite is a link sent
 * from the share sheet; the team is on Settings › Your team afterwards.
 */
export default function BackupScreen() {
	const { settings, saveSettings } = useMonitor();
	const { goNext } = useOnboarding();
	const { ownTeam } = useTeam();
	const t = useStrings();
	const [minutes, setMinutes] = useState(settings.backupAfterMinutes);
	const { helpers, waiting } = teamCounts(ownTeam);
	const invited = helpers + waiting > 0;

	const save = async () => {
		await saveSettings({ ...settings, backupAfterMinutes: minutes });
		goNext("backup");
	};

	return (
		<OnboardingScreen
			step="backup"
			icon="person.2.fill"
			title={t.onboarding.backup.title}
			body={t.onboarding.backup.body(minutes)}
			actions={
				<Button
					title={invited ? t.common.continue : t.common.skipForNow}
					onPress={() => void save()}
				/>
			}>
			{invited ? <TeamList team={ownTeam} /> : null}
			<InviteButton />
			<View style={styles.wait}>
				<Text style={styles.waitLabel}>{t.onboarding.backup.reachOutAfter}</Text>
				<Options>
					{WAIT_OPTIONS.map((m) => (
						<Button
							key={m}
							compact
							title={t.onboarding.backup.minutes(m)}
							variant="secondary"
							selected={m === minutes}
							onPress={() => setMinutes(m)}
						/>
					))}
				</Options>
			</View>
		</OnboardingScreen>
	);
}

const styles = StyleSheet.create({
	wait: { gap: 8 },
	waitLabel: { fontSize: 15, lineHeight: 21, fontWeight: "600", color: colors.secondary },
});
