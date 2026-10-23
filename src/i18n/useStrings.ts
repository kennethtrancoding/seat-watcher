import { useSyncExternalStore } from 'react';

import { getLanguage, strings, subscribeToLanguage, type Language, type Strings } from './i18n';

/** Every string in the current language. The component re-renders when the language changes. */
export function useStrings(): Strings {
  return useSyncExternalStore(subscribeToLanguage, strings);
}

/** The language the app is showing now. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribeToLanguage, getLanguage);
}
