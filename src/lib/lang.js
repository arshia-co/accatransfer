// Language utilities shared by the UI, flows and store.
// Supported conversation languages. "Other" falls back to English.
export const SUPPORTED_LANGS = ['fa', 'en', 'tr', 'ar'];

export const RTL_LANGS = new Set(['fa', 'ar']);
export const DEFAULT_LANG = 'fa';
export const SITE_LANG_KEY = 'acca-site-lang';
export const SITE_LANG_EVENT = 'acca:language-change';

const LEGACY_LANG_KEYS = [
  'acca-gateway-lang',
  'acca-account-lang',
  'acca_smart_apply_lang',
  'acca-lang',
];

const isBrowser = () => typeof window !== 'undefined' && !!window.localStorage;

export function normalizeLang(lang, fallback = null, allowed = SUPPORTED_LANGS) {
  const value = String(lang || '').toLowerCase();
  return allowed.includes(value) ? value : fallback;
}

export function readStoredLang({ fallback = null, allowed = SUPPORTED_LANGS } = {}) {
  if (!isBrowser()) return fallback;

  const keys = [SITE_LANG_KEY, ...LEGACY_LANG_KEYS];
  for (const key of keys) {
    try {
      const saved = normalizeLang(window.localStorage.getItem(key), null, allowed);
      if (saved) return saved;
    } catch {
      /* private mode / quota - non-fatal */
    }
  }

  return fallback;
}

export function writeStoredLang(lang, { allowed = SUPPORTED_LANGS } = {}) {
  const next = normalizeLang(lang, null, allowed);
  if (!next) return null;
  if (!isBrowser()) return next;

  const previous = readStoredLang({ fallback: null, allowed: SUPPORTED_LANGS });
  try {
    window.localStorage.setItem(SITE_LANG_KEY, next);
    LEGACY_LANG_KEYS.forEach((key) => window.localStorage.setItem(key, next));
  } catch {
    /* Browser storage is best-effort; in-memory state still updates. */
  }

  if (previous !== next) {
    window.dispatchEvent(new CustomEvent(SITE_LANG_EVENT, { detail: { lang: next } }));
  }

  return next;
}

export function subscribeStoredLang(callback, { allowed = SUPPORTED_LANGS } = {}) {
  if (typeof window === 'undefined') return () => {};

  const notify = (value) => {
    const next = normalizeLang(value, null, allowed);
    if (next) callback(next);
  };

  const onCustom = (event) => notify(event?.detail?.lang);
  const onStorage = (event) => {
    if (!event?.key || event.key === SITE_LANG_KEY || LEGACY_LANG_KEYS.includes(event.key)) {
      notify(readStoredLang({ fallback: null, allowed }));
    }
  };

  window.addEventListener(SITE_LANG_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(SITE_LANG_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

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
