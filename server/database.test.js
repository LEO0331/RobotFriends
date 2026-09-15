const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createStore } = require('./store');

test('sqlite store retains immutable history across store reopen', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gridline-db-'));
  let store = createStore(directory);
  await store.saveObservations('prices', [
    { id: 'p1', source: 'prices', type: 'close', ticker: 'NBIS', value: 10, observedAt: '2026-09-14T00:00:00.000Z', retrievedAt: '2026-09-15T00:00:00.000Z' },
    { id: 'p2', source: 'prices', type: 'close', ticker: 'NBIS', value: 11, observedAt: '2026-09-15T00:00:00.000Z', retrievedAt: '2026-09-15T22:00:00.000Z' },
  ]);
  store.close();
  store = createStore(directory);
  const rows = await store.observations({ ticker: 'NBIS', type: 'close' });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(item => item.value), [10, 11]);
  store.close();
  await fs.rm(directory, { recursive: true, force: true });
});

test('sqlite score snapshots preserve methodology and point-in-time payload', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gridline-score-db-'));
  const store = createStore(directory);
  await store.saveScoreSnapshots([{ ticker: 'NBIS', asOf: '2026-09-15T22:00:00.000Z', calculatedAt: '2026-09-15T22:00:01.000Z', methodologyVersion: 'v1', fundamentals: 83 }]);
  const rows = await store.scoreSnapshots({ ticker: 'NBIS' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].methodologyVersion, 'v1');
  store.close();
  await fs.rm(directory, { recursive: true, force: true });
});
