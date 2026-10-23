import { router } from 'expo-router';
import { useState } from 'react';

import { ChildPhotoPicker } from '../../components/ChildPhoto';
import { Button, Notice, TextField } from '../../components/ui';
import { useStrings } from '../../i18n/useStrings';
import { useMonitor } from '../../monitor/MonitorProvider';
import { OnboardingScreen } from '../../onboarding/OnboardingScreen';
import { MAX_CHILD_NAME_LENGTH, MAX_SEATS, ownSeats } from '../../seats/seats';

/** "Add a car seat": who rides in it, then pairing with the hardware. */
export default function NewSeatScreen() {
  const { seats, addSeat } = useMonitor();
  const t = useStrings();
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const trimmed = name.trim();
  const taken = seats.some((s) => s.childName.toLowerCase() === trimmed.toLowerCase());

  const add = async () => {
    const seat = await addSeat({ childName: trimmed, childPhotoUri: photoUri });
    // Replace this screen, so finishing pairing goes back home.
    router.replace({ pathname: '/seat/pair', params: { id: seat.id } });
  };

  // Seats shared with you don't count: the limit is on your own.
  if (ownSeats(seats).length >= MAX_SEATS) {
    return (
      <OnboardingScreen
        icon="car.2.fill"
        title={t.newSeat.fullTitle}
        body={t.newSeat.fullBody(MAX_SEATS)}
        actions={<Button title={t.common.back} onPress={() => router.back()} />}
      />
    );
  }

  return (
    <OnboardingScreen
      icon="plus.circle.fill"
      title={t.newSeat.title}
      body={t.newSeat.body(trimmed || t.newSeat.exampleName)}
      actions={
        <>
          <Button title={t.newSeat.next} disabled={!trimmed} onPress={() => void add()} />
          <Button title={t.common.cancel} variant="secondary" onPress={() => router.back()} />
        </>
      }
    >
      <TextField
        label={t.common.childName}
        value={name}
        onChangeText={setName}
        placeholder={t.common.firstName}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={MAX_CHILD_NAME_LENGTH}
        returnKeyType="done"
        autoFocus
      />
      {taken ? <Notice tone="info">{t.newSeat.taken(trimmed)}</Notice> : null}
      <ChildPhotoPicker uri={photoUri} name={trimmed} onChange={setPhotoUri} />
    </OnboardingScreen>
  );
}
