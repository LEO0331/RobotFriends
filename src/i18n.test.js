import {
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  persistLanguage,
  readPreferredLanguage,
  readStoredLanguage,
  shouldApplyAccountLanguage,
} from './i18n';

beforeEach(() => {
  window.localStorage.clear();
});

test('language helpers persist and restore supported locales', () => {
  expect(readStoredLanguage()).toBeNull();
  expect(readPreferredLanguage()).toBe('en');
  expect(persistLanguage('zh-TW')).toBe('zh-TW');
  expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh-TW');
  expect(readPreferredLanguage()).toBe('zh-TW');
  expect(normalizeLanguage('unsupported')).toBe('en');
});

test('account language only initializes when no local preference exists', () => {
  expect(shouldApplyAccountLanguage('zh-TW')).toBe(true);
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh-TW');
  expect(shouldApplyAccountLanguage('en')).toBe(false);
  expect(shouldApplyAccountLanguage('fr')).toBe(false);
});
