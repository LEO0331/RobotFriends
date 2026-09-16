const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createStore } = require('./store');
const { createService } = require('./service');
const { dueAfterClose } = require('./scheduler');
const { parseCsv } = require('./http');

test('CSV adapter returns dated price rows', () => {
  assert.deepEqual(parseCsv('Date,Close\n2026-01-02,12.5\n'), [{ Date: '2026-01-02', Close: '12.5' }]);
});
test('store retains historical observations instead of replacing a source', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gridline-test-')); const store = createStore(directory);
  await store.saveObservations('sec', [{ id: 'sec-1', source: 'sec', value: 1, observedAt: '2026-01-01T00:00:00Z' }]);
  await store.saveObservations('prices', [{ id: 'price-1', source: 'prices', value: 2, observedAt: '2026-01-01T00:00:00Z' }]);
  await store.saveObservations('sec', [{ id: 'sec-2', source: 'sec', value: 3, observedAt: '2026-02-01T00:00:00Z' }]);
  const rows = await store.observations();
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(item => item.value).sort((a, b) => a - b), [1, 2, 3]);
  store.close();
  await fs.rm(directory, { recursive: true, force: true });
});
test('service reports supported adapters without configuration', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gridline-source-list-'));
  const service = createService({ dataDir: directory, cacheMinutes: 1 });
  assert.deepEqual(service.sources(), ['sec', 'eia', 'pjm', 'ferc', 'company-ir', 'prices']);
  service.store.close();
  await fs.rm(directory, { recursive: true, force: true });
});
test('post-close scheduler excludes weekends and runs after 4:15pm ET', () => {
  assert.equal(dueAfterClose(new Date('2026-09-14T20:14:00Z')).due, false);
  assert.equal(dueAfterClose(new Date('2026-09-14T20:15:00Z')).due, true);
  assert.equal(dueAfterClose(new Date('2026-09-13T20:16:00Z')).due, false);
});
test('observation queries apply bounded pagination', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gridline-page-test-')); const store = createStore(directory);
  await store.saveObservations('prices', [
    { id: 'p1', source: 'prices', value: 1, observedAt: '2026-01-01T00:00:00Z' },
    { id: 'p2', source: 'prices', value: 2, observedAt: '2026-01-02T00:00:00Z' },
    { id: 'p3', source: 'prices', value: 3, observedAt: '2026-01-03T00:00:00Z' },
  ]);
  const rows = await store.observations({ limit: 1, offset: 1 });
  assert.deepEqual(rows.map(item => item.value), [2]);
  store.close();
  await fs.rm(directory, { recursive: true, force: true });
});
