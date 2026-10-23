import { useState } from "react";

import { ChildPhotoPicker } from "../../components/ChildPhoto";
import { Button, TextField } from "../../components/ui";
import { useStrings } from "../../i18n/useStrings";
import { useMonitor } from "../../monitor/MonitorProvider";
import { deleteChildPhoto } from "../../onboarding/childPhoto";
import { useOnboarding } from "../../onboarding/OnboardingProvider";
import { OnboardingScreen } from "../../onboarding/OnboardingScreen";
import { MAX_CHILD_NAME_LENGTH } from "../../seats/seats";

/**
 * The first seat's child: name and optional photo, so alerts say "Emma's
 * seat is too hot". More seats can be added from the home screen later.
 */
export default function ChildScreen() {
	const { seats, addSeat, updateSeat } = useMonitor();
	const { goNext } = useOnboarding();
	const t = useStrings();
	const first = seats[0];
	const [name, setName] = useState(first?.childName ?? "");
	const [photoUri, setPhotoUri] = useState(first?.childPhotoUri ?? "");
	const trimmed = name.trim();

	const save = async () => {
		if (first) {
			if (first.childPhotoUri !== photoUri) deleteChildPhoto(first.childPhotoUri);
			await updateSeat(first.id, { childName: trimmed, childPhotoUri: photoUri });
		} else {
			await addSeat({ childName: trimmed, childPhotoUri: photoUri });
		}
		goNext("child");
	};

	return (
		<OnboardingScreen
			step="child"
			icon="heart.fill"
			title={t.onboarding.child.title}
			body={t.onboarding.child.body(trimmed || t.onboarding.child.exampleName)}
			actions={<Button title={t.common.continue} disabled={!trimmed} onPress={() => void save()} />}>
			<TextField
				label={t.onboarding.child.name}
				value={name}
				onChangeText={setName}
				placeholder={t.common.firstName}
				autoCapitalize="words"
				autoCorrect={false}
				maxLength={MAX_CHILD_NAME_LENGTH}
				returnKeyType="done"
			/>
			<ChildPhotoPicker uri={photoUri} name={trimmed} onChange={setPhotoUri} />
		</OnboardingScreen>
	);
}
