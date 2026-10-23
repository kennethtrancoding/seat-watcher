import AsyncStorage from '@react-native-async-storage/async-storage';

import { NEW_ONBOARDING, parseOnboardingRecord, type OnboardingRecord } from './flow';

const KEY = 'carSeatMonitor.onboarding.v1';

export async function loadOnboarding(): Promise<OnboardingRecord> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? parseOnboardingRecord(JSON.parse(raw)) : NEW_ONBOARDING;
  } catch {
    return NEW_ONBOARDING;
  }
}

export async function saveOnboarding(record: OnboardingRecord): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(record));
}
