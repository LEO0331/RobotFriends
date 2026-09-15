const test = require('node:test');
const assert = require('node:assert/strict');
const { attachProvenance, normalizeObservations, provenanceSummary } = require('./provenance');

test('provenance creates deterministic ids for the same source record', () => {
  const input = { source: 'prices', type: 'close', ticker: 'NBIS', value: 42, observedAt: '2026-09-15T00:00:00.000Z', retrievedAt: '2026-09-15T22:00:00.000Z', confidence: 0.7 };
  const first = attachProvenance(input);
  const second = attachProvenance(input);
  assert.equal(first.id, second.id);
  assert.equal(first.provenance.originUrl, 'https://stooq.com/');
  assert.deepEqual(first.provenance.lineage, [first.id]);
});

test('provenance ids distinguish historical observations', () => {
  const rows = normalizeObservations('prices', [
    { type: 'close', ticker: 'NBIS', value: 40, observedAt: '2026-09-14T00:00:00.000Z' },
    { type: 'close', ticker: 'NBIS', value: 42, observedAt: '2026-09-15T00:00:00.000Z' },
  ], '2026-09-15T22:00:00.000Z');
  assert.notEqual(rows[0].id, rows[1].id);
  assert.equal(provenanceSummary(rows).originUrlCoverage, 1);
});
