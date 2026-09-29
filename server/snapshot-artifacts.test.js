const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRuntimeSnapshot } = require('./runtime-snapshot');
const { runtimeSnapshotMatches } = require('./snapshot-artifacts');

test('runtime snapshot gate rejects an older compact dashboard even when the full snapshot is valid', () => {
  const full = { schemaVersion: 4, generatedAt: '2026-09-29T22:17:00Z', sourceHealth: { events: { status: 'ok', recordCount: 1 } }, observations: [] };
  const compact = buildRuntimeSnapshot(full);
  assert.equal(runtimeSnapshotMatches(full, compact), true);
  assert.equal(runtimeSnapshotMatches(full, { ...compact, generatedAt: '2026-09-26T22:17:00Z' }), false);
  assert.equal(runtimeSnapshotMatches(full, { ...compact, sourceHealth: { events: { status: 'ok', recordCount: 4 } } }), false);
});
