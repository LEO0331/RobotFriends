export const LANGUAGE_STORAGE_KEY = 'gridline-language';
export const SUPPORTED_LANGUAGES = ['en', 'zh-TW'];

export const normalizeLanguage = value => value === 'zh-TW' ? 'zh-TW' : 'en';
export const isTraditionalChinese = language => normalizeLanguage(language) === 'zh-TW';

export function readStoredLanguage(storage = window.localStorage) {
  try {
    const stored = storage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function readPreferredLanguage(storage = window.localStorage) {
  return readStoredLanguage(storage) || 'en';
}

export function persistLanguage(language, storage = window.localStorage) {
  const normalized = normalizeLanguage(language);
  try { storage.setItem(LANGUAGE_STORAGE_KEY, normalized); } catch {}
  return normalized;
}

export function shouldApplyAccountLanguage(language, storage = window.localStorage) {
  return SUPPORTED_LANGUAGES.includes(language) && readStoredLanguage(storage) === null;
}

export const translate = (language, en, zhTW) => isTraditionalChinese(language) ? zhTW : en;
