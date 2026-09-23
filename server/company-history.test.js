const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeCompanyHistory } = require('./company-history');
const { VERSION } = require('./scoring/engine');

const company = { ticker: 'NBIS', methodologyVersion: VERSION, marketSignal: { available: true, ma5: 105, ma10: 103, trend: 'above' } };

test('company history keeps one point-in-time score snapshot per ticker per day', () => {
  const first = mergeCompanyHistory([], [company], '2026-09-15T22:00:00.000Z');
  const second = mergeCompanyHistory(first, [{ ...company, marketSignal: { ...company.marketSignal, ma5: 106 } }], '2026-09-15T23:00:00.000Z');
  assert.equal(second.length, 1);
  assert.equal(second[0].marketSignal.ma5, 106);
  assert.equal(second[0].observedAt, '2026-09-15T23:00:00.000Z');
});

test('company history preserves prior dates for lookback comparisons', () => {
  const previous = [{ ...company, observedAt: '2026-08-15T22:00:00.000Z' }];
  const merged = mergeCompanyHistory(previous, [company], '2026-09-15T22:00:00.000Z');
  assert.equal(merged.length, 2);
  assert.deepEqual(merged.map(item => item.observedAt), ['2026-08-15T22:00:00.000Z', '2026-09-15T22:00:00.000Z']);
});

test('new history excludes old curated and reconstructed scores', () => {
  const previous = [
    { ticker: 'NBIS', observedAt: '2026-09-14T22:00:00.000Z', methodologyVersion: 'gridline-company-v1.0.0', emotion: 39 },
    { ticker: 'NBIS', observedAt: '2026-09-13T22:00:00.000Z', methodologyVersion: VERSION, origin: 'historical-reconstruction', marketSignal: { available: true } },
  ];
  const current = { ticker: 'NBIS', methodologyVersion: VERSION, marketSignal: { available: true, ma5: 105, ma10: 103, trend: 'above' } };
  const result = mergeCompanyHistory(previous, [current], '2026-09-15T22:00:00.000Z');
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].marketSignal, current.marketSignal);
  assert.equal(result[0].fundamentals, null);
  assert.equal(result[0].origin, 'recorded');
});
