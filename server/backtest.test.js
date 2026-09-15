const test = require('node:test');
const assert = require('node:assert/strict');
const { runBacktest } = require('./backtest');

const price = (id, date, value) => ({ id, source: 'prices', type: 'close', ticker: 'NBIS', observedAt: `${date}T00:00:00.000Z`, value });

test('point-in-time backtest evaluates completed constructive and caution signals', () => {
  const observations = [
    price('p1','2026-01-02',100), price('p2','2026-02-02',110), price('p3','2026-03-04',100), price('p4','2026-04-03',105),
  ];
  const scores = [
    { ticker: 'NBIS', asOf: '2026-01-01T22:00:00.000Z', gap: 'Positive', methodologyVersion: 'v1' },
    { ticker: 'NBIS', asOf: '2026-02-01T22:00:00.000Z', gap: 'Elevated', methodologyVersion: 'v1' },
  ];
  const result = runBacktest({ ticker: 'NBIS', horizonDays: 30 }, scores, observations);
  assert.equal(result.metrics.sampleSize, 2);
  assert.equal(result.metrics.directionalHitRate, 1);
  assert.equal(result.status, 'complete');
});

test('future-dated lineage invalidates a signal', () => {
  const observations = [price('future','2026-02-01',100)];
  const scores = [{ ticker: 'NBIS', asOf: '2026-01-01T00:00:00.000Z', gap: 'Positive', lineage: ['future'] }];
  const result = runBacktest({ ticker: 'NBIS', horizonDays: 30 }, scores, observations);
  assert.equal(result.metrics.invalidSignals, 1);
  assert.equal(result.rows[0].status, 'invalid');
});
