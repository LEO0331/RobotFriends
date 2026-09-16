const test = require('node:test');
const assert = require('node:assert/strict');
const {
  reconstructCompanyHistory,
  mergeReconstructedHistory,
  reconstructionSummary,
} = require('./historical-reconstruction');

const companies = [{ ticker: 'NBIS', name: 'Nebius Group' }];

function prices(start, count) {
  const rows = [];
  const first = Date.parse(start);
  for (let index = 0; index < count; index += 1) {
    const observedAt = new Date(first + index * 24 * 60 * 60 * 1000).toISOString();
    rows.push({
      id: `p-${index}`,
      source: 'prices',
      type: 'close',
      ticker: 'NBIS',
      observedAt,
      value: 100 + index,
    });
  }
  return rows;
}

test('reconstruction emits weekly point-in-time rows only when historical prices support market emotion', () => {
  const observations = prices('2026-01-01T00:00:00.000Z', 230);
  const rows = reconstructCompanyHistory({
    companies,
    observations,
    generatedAt: '2026-07-21T12:00:00.000Z',
    startDate: '2026-06-01',
    cadenceDays: 7,
  });

  assert.ok(rows.length > 0);
  assert.equal(rows[0].origin, 'historical-reconstruction');
  assert.equal(rows[0].pointInTimeQuality, 'partial');
  assert.equal(rows[0].observedAt, '2026-06-01T23:59:59.999Z');
  assert.ok(rows.every(row => row.qualityNotes.some(note => note.includes('historical-vintage'))));
});

test('reconstruction never includes lineage observed after the historical cutoff', () => {
  const observations = [
    ...prices('2026-01-01T00:00:00.000Z', 230),
    { id: 'future-ir', source: 'company-ir', type: 'announcement', ticker: 'NBIS', observedAt: '2026-08-01T00:00:00.000Z', value: 1 },
  ];
  const rows = reconstructCompanyHistory({
    companies,
    observations,
    generatedAt: '2026-07-21T12:00:00.000Z',
    startDate: '2026-06-01',
    cadenceDays: 7,
  });

  assert.ok(rows.length > 0);
  assert.ok(rows.every(row => !row.lineage.includes('future-ir')));
});

test('recorded history wins over reconstruction on the same ticker/date', () => {
  const recorded = [{ ticker: 'NBIS', observedAt: '2026-06-01T22:00:00.000Z', gap: 'Positive', origin: 'recorded' }];
  const reconstructed = [{ ticker: 'NBIS', observedAt: '2026-06-01T23:59:59.999Z', gap: 'Elevated', origin: 'historical-reconstruction' }];
  const merged = mergeReconstructedHistory(recorded, reconstructed);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].origin, 'recorded');
});

test('coverage summary distinguishes recorded and reconstructed rows', () => {
  const summary = reconstructionSummary([
    { ticker: 'NBIS', observedAt: '2026-06-01T00:00:00Z', origin: 'historical-reconstruction', reconstructionVersion: 'v1' },
    { ticker: 'NBIS', observedAt: '2026-09-15T00:00:00Z', origin: 'recorded' },
  ]);
  assert.deepEqual(summary, {
    start: '2026-06-01',
    end: '2026-09-15',
    recorded: 1,
    reconstructed: 1,
    reconstructionVersion: 'v1',
    reconstructionQuality: 'partial',
  });
});
