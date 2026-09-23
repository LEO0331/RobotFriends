const test = require('node:test');
const assert = require('node:assert/strict');
const { reconstructionSummary } = require('./historical-reconstruction');

test('coverage summarizes recorded observations only', () => {
  const summary = reconstructionSummary([
    { ticker: 'NBIS', observedAt: '2026-09-15T00:00:00Z', origin: 'recorded' },
    { ticker: 'ORCL', observedAt: '2026-09-16T00:00:00Z', origin: 'recorded' },
  ]);
  assert.deepEqual(summary, {
    start: '2026-09-15',
    end: '2026-09-16',
    recorded: 2,
    reconstructed: 0,
    reconstructionVersion: null,
    reconstructionQuality: 'recorded-only',
  });
});
