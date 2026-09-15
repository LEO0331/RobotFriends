const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeCompanyHistory } = require('./company-history');

const company = { ticker: 'NBIS', emotion: 39, fundamentals: 83, exposure: 92, gap: 'Positive', confidence: 86 };

test('company history keeps one point-in-time score snapshot per ticker per day', () => {
  const first = mergeCompanyHistory([], [company], '2026-09-15T22:00:00.000Z');
  const second = mergeCompanyHistory(first, [{ ...company, emotion: 41 }], '2026-09-15T23:00:00.000Z');
  assert.equal(second.length, 1);
  assert.equal(second[0].emotion, 41);
  assert.equal(second[0].observedAt, '2026-09-15T23:00:00.000Z');
});

test('company history preserves prior dates for lookback comparisons', () => {
  const previous = [{ ticker: 'NBIS', observedAt: '2026-08-15T22:00:00.000Z', emotion: 35, fundamentals: 80, exposure: 90, gap: 'Positive', confidence: 84 }];
  const merged = mergeCompanyHistory(previous, [company], '2026-09-15T22:00:00.000Z');
  assert.equal(merged.length, 2);
  assert.deepEqual(merged.map(item => item.observedAt), ['2026-08-15T22:00:00.000Z', '2026-09-15T22:00:00.000Z']);
});
