const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeSnapshotObservations, mergeSnapshotHealth } = require('./snapshot-merge');

const observation = (id, source, date, value) => ({ id, source, type: 'close', ticker: source === 'prices' ? 'NBIS' : undefined, observedAt: `${date}T00:00:00.000Z`, value });

test('degraded price refresh retains last-known-good static price history', () => {
  const previous = [
    observation('price-old', 'prices', '2026-09-14', 100),
    { id: 'eia-old', source: 'eia', type: 'rtoLoad', observedAt: '2026-09-14T00:00:00.000Z', value: 50 },
  ];
  const fresh = [{ id: 'eia-new', source: 'eia', type: 'rtoLoad', observedAt: '2026-09-15T00:00:00.000Z', value: 55 }];
  const outcomes = [
    { source: 'prices', status: 'degraded', message: 'zero rows' },
    { source: 'eia', status: 'ok', recordCount: 1 },
  ];
  const merged = mergeSnapshotObservations(previous, fresh, outcomes);
  assert.equal(merged.some(item => item.id === 'price-old'), true);
  assert.equal(merged.some(item => item.id === 'eia-old'), false);
  assert.equal(merged.some(item => item.id === 'eia-new'), true);
});

test('successful price refresh replaces old static price source records', () => {
  const previous = [observation('price-old', 'prices', '2026-09-14', 100)];
  const fresh = [observation('price-new', 'prices', '2026-09-15', 101)];
  const merged = mergeSnapshotObservations(previous, fresh, [{ source: 'prices', status: 'ok', recordCount: 1 }]);
  assert.deepEqual(merged.map(item => item.id), ['price-new']);
});

test('merge deduplicates retained and persistent observations by stable identity', () => {
  const row = observation('same', 'prices', '2026-09-14', 100);
  const merged = mergeSnapshotObservations([row], [row], [{ source: 'prices', status: 'degraded' }]);
  assert.equal(merged.length, 1);
});

test('degraded health retains prior last-success timestamp and reports retained row count', () => {
  const observations = [
    observation('p1', 'prices', '2026-09-14', 100),
    observation('p2', 'prices', '2026-09-15', 101),
  ];
  const health = mergeSnapshotHealth(
    { prices: { status: 'ok', lastSuccessAt: '2026-09-15T22:00:00.000Z', recordCount: 2 } },
    { prices: { status: 'degraded', checkedAt: '2026-09-16T22:00:00.000Z', message: 'upstream unavailable' } },
    observations,
  );
  assert.equal(health.prices.status, 'degraded');
  assert.equal(health.prices.lastSuccessAt, '2026-09-15T22:00:00.000Z');
  assert.equal(health.prices.retainedRecordCount, 2);
  assert.equal(health.prices.message, 'upstream unavailable');
});

test('healthy refresh uses current health metadata without retained marker', () => {
  const health = mergeSnapshotHealth(
    { eia: { status: 'degraded', lastSuccessAt: '2026-09-14T22:00:00.000Z' } },
    { eia: { status: 'ok', lastSuccessAt: '2026-09-16T22:00:00.000Z', recordCount: 24 } },
    [],
  );
  assert.equal(health.eia.status, 'ok');
  assert.equal(health.eia.lastSuccessAt, '2026-09-16T22:00:00.000Z');
  assert.equal(health.eia.retainedRecordCount, undefined);
});
