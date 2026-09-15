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
test('store replaces only observations for the same source', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gridline-test-')); const store = createStore(directory);
  await store.saveObservations('sec', [{ source: 'sec', value: 1 }]); await store.saveObservations('prices', [{ source: 'prices', value: 2 }]); await store.saveObservations('sec', [{ source: 'sec', value: 3 }]);
  assert.deepEqual(await store.observations(), [{ source: 'prices', value: 2 }, { source: 'sec', value: 3 }]);
  await fs.rm(directory, { recursive: true, force: true });
});
test('service reports supported adapters without configuration', () => {
  const service = createService({ dataDir: path.join(os.tmpdir(), 'gridline-source-list'), cacheMinutes: 1 });
  assert.deepEqual(service.sources(), ['sec', 'eia', 'pjm', 'ferc', 'company-ir', 'prices']);
});
test('post-close scheduler excludes weekends and runs after 4:15pm ET', () => {
  assert.equal(dueAfterClose(new Date('2026-09-14T20:14:00Z')).due, false);
  assert.equal(dueAfterClose(new Date('2026-09-14T20:15:00Z')).due, true);
  assert.equal(dueAfterClose(new Date('2026-09-13T20:16:00Z')).due, false);
});
