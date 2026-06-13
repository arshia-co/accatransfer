// Language utilities shared by the UI, flows and store.
// Supported conversation languages. "Other" falls back to English.
export const SUPPORTED_LANGS = ['fa', 'en', 'tr', 'ar'];

export const RTL_LANGS = new Set(['fa', 'ar']);

export function dirFor(lang) {
  return RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
}

/**
 * Picks a localized string from a {fa,en,tr,ar} object.
 * Falls back to English, then to the first available value, so flows can
 * ship partial translations without crashing the UI.
 */
export function L(value, lang) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value.en ?? Object.values(value)[0] ?? '';
}

export function langLabel(lang) {
  switch (lang) {
    case 'fa': return 'فارسی';
    case 'en': return 'English';
    case 'tr': return 'Türkçe';
    case 'ar': return 'العربية';
    default: return lang;
  }
}
