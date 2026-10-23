/**
 * The app's languages. Every word it shows, says or sends comes from en.ts or
 * es.ts: pure code reads it with strings(), components with useStrings() (so
 * they re-render when the language changes). See docs/languages.md.
 *
 * Pure: no React or native imports, so alert text stays unit-testable. The
 * phone's languages come from deviceLanguage.ts.
 */

import { en, type Strings } from './en';
import { es } from './es';

export type { Strings };

export type Language = 'en' | 'es';

export const LANGUAGES: readonly Language[] = ['en', 'es'];

/** What's picked in Settings: a language, or 'system' to follow the phone. */
export type LanguageChoice = 'system' | Language;

export const LANGUAGE_CHOICES: readonly LanguageChoice[] = ['system', ...LANGUAGES];

/** Each language's name in itself, so it can be found by someone who can't read the current one. */
export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', es: 'Español' };

const DICTIONARIES: Record<Language, Strings> = { en, es };

/** For dates and times. US English and US Spanish. */
const LOCALES: Record<Language, string> = { en: 'en-US', es: 'es-US' };

/** The read-aloud voice. Locale tags for read-aloud; available voices depend on the device. */
const VOICES: Record<Language, string> = { en: 'en-US', es: 'es-MX' };

let current: Language = 'en';
const listeners = new Set<() => void>();

export function getLanguage(): Language {
  return current;
}

/** Switches every screen, and the text of later notifications, to `language`. */
export function setLanguage(language: Language): void {
  if (language === current) return;
  current = language;
  listeners.forEach((l) => l());
}

export function subscribeToLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Every string, in the current language. Call it when the text is needed
 * rather than once at import time, so a change of language reaches it.
 */
export function strings(): Strings {
  return DICTIONARIES[current];
}

/** The current language as a locale, for toLocaleDateString and friends. */
export function locale(): string {
  return LOCALES[current];
}

/** The language for expo-speech's voice. */
export function speechLanguage(): string {
  return VOICES[current];
}

/**
 * The language to use: the one picked in Settings, or else the first of the
 * phone's preferred languages (most preferred first, e.g. ['es-MX', 'en-US'])
 * that the app speaks, or else English.
 */
export function resolveLanguage(choice: LanguageChoice, preferred: readonly string[]): Language {
  if (choice !== 'system') return choice;
  for (const tag of preferred) {
    const code = tag.toLowerCase().split(/[-_]/)[0];
    const match = LANGUAGES.find((l) => l === code);
    if (match) return match;
  }
  return 'en';
}
