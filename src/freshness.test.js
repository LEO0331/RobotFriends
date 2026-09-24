import {
  MARKET_RECENCY_DAYS,
  observationRecency,
  observationRecencyLabel,
} from './freshness';

test('observation recency uses the snapshot timestamp rather than wall-clock time', () => {
  expect(observationRecency(
    '2026-09-22T20:00:00Z',
    '2026-09-24T20:00:00Z'
  )).toEqual({
    available: true,
    days: 2,
    status: 'current',
  });
});

test('market observations beyond the existing demo coverage window are marked stale', () => {
  expect(MARKET_RECENCY_DAYS).toBe(10);
  expect(observationRecency(
    '2026-09-01T20:00:00Z',
    '2026-09-24T20:00:00Z'
  )).toEqual({
    available: true,
    days: 23,
    status: 'stale',
  });
});

test('future or invalid observations fail closed', () => {
  expect(observationRecency('2026-09-25T00:00:00Z', '2026-09-24T00:00:00Z').available).toBe(false);
  expect(observationRecency('invalid', '2026-09-24T00:00:00Z').available).toBe(false);
  expect(observationRecency('2026-09-24T00:00:00Z', null).available).toBe(false);
});

test('recency labels are bilingual and explicit about stale coverage', () => {
  expect(observationRecencyLabel(
    '2026-09-24T00:00:00Z',
    '2026-09-24T22:00:00Z',
    'en'
  )).toBe('same day as snapshot');

  expect(observationRecencyLabel(
    '2026-09-01T00:00:00Z',
    '2026-09-24T00:00:00Z',
    'zh-TW'
  )).toBe('較快照早 23 天 · 超過示範涵蓋時效');
});
