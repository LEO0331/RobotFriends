const test = require('node:test');
const assert = require('node:assert/strict');
const { runBacktest } = require('./backtest');

const price = (day, value, sourceUrl = 'https://stooq.com/q/d/l/?s=nbis.us&i=d') => ({
  source: 'prices', type: 'close', ticker: 'NBIS', value, sourceUrl,
  observedAt: new Date(Date.UTC(2026, 0, day)).toISOString(),
});

test('price-only crossover enters next session and exits ten observed sessions later', () => {
  const observations = [...Array.from({ length: 10 }, (_, index) => price(index + 1, 100)), price(11, 110),
    ...Array.from({ length: 11 }, (_, index) => price(index + 12, 111 + index))];
  const result = runBacktest({ ticker: 'NBIS' }, observations);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].signalAt, price(11, 110).observedAt);
  assert.equal(result.rows[0].entryAt, price(12, 111).observedAt);
  assert.equal(result.rows[0].exitAt, price(22, 121).observedAt);
  assert.equal(result.metrics.sampleSize, 1);
  assert.equal(result.rows[0].sourceUrl, price(11, 110).sourceUrl);
});

test('pending and unreferenced signals cannot enter performance statistics', () => {
  const observations = [...Array.from({ length: 10 }, (_, index) => price(index + 1, 100)), price(11, 110), price(12, 111)];
  const pending = runBacktest({ ticker: 'NBIS' }, observations);
  assert.equal(pending.metrics.sampleSize, 0);
  assert.equal(pending.metrics.pendingSignals, 1);
  assert.equal(pending.metrics.directionalHitRate, null);
  const unreferenced = runBacktest({ ticker: 'NBIS' }, observations.map(item => ({ ...item, sourceUrl: null })));
  assert.equal(unreferenced.coverage.priceObservations, 0);
});
