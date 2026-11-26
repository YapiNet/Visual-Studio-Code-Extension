import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Keep these in sync with the Yapi.UI language list. The regression test
// checks the shared product list, all manifest strings and all UI messages.
export const languages = [
  { locale: 'en', name: 'English' },
  { locale: 'tr', name: 'Türkçe' },
  { locale: 'ar', name: 'العربية' },
  { locale: 'ru', name: 'Русский' },
  { locale: 'zh', name: '简体中文' },
  { locale: 'ja', name: '日本語' },
  { locale: 'az', name: 'Azərbaycanca' },
  { locale: 'ko', name: '한국어' },
  { locale: 'de', name: 'Deutsch' },
  { locale: 'vi', name: 'Tiếng Việt' },
  { locale: 'th', name: 'ไทย' },
  { locale: 'he', name: 'עברית' },
  { locale: 'uz', name: 'Oʻzbekcha' },
  { locale: 'kk', name: 'Қазақша' },
  { locale: 'ug', name: 'ئۇيغۇرچە' },
] as const;

export type Locale = typeof languages[number]['locale'];
export type LanguagePreference = 'auto' | Locale;

export function normalizeLocale(value: unknown): Locale {
  const language = typeof value === 'string' ? value.toLowerCase().split(/[-_]/)[0] : '';
  return languages.find(entry => entry.locale === language)?.locale ?? 'en';
}

export function resolveLocale(preference: unknown, editorLanguage: string): Locale {
  return normalizeLocale(preference === 'auto' || preference === undefined ? editorLanguage : preference);
}

export function direction(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' || locale === 'he' || locale === 'ug' ? 'rtl' : 'ltr';
}

type Bundle = Record<string, string>;
const bundles = new Map<Locale, Bundle>();

export function translate(locale: Locale, message: string): string {
  let bundle = bundles.get(locale);
  if (!bundle) {
    const filename = locale === 'en' ? 'bundle.l10n.json' : `bundle.l10n.${locale}.json`;
    // The locale is resolved against the fixed list, never an arbitrary path.
    bundle = JSON.parse(readFileSync(join(__dirname, '..', 'l10n', filename), 'utf8')) as Bundle;
    bundles.set(locale, bundle);
  }
  return bundle[message] ?? message;
}
