const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateDemoReadiness } = require('./demo-readiness');

const DAY_MS = 24 * 60 * 60 * 1000;

function priceRows(ticker, end = new Date(), count = 70) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end.getTime() - (count - 1 - index) * DAY_MS);
    return {
      id: `${ticker}-${index}`,
      source: 'prices',
      type: 'close',
      ticker,
      value: 100 + index,
      observedAt: date.toISOString(),
      provenance: { provider: 'Fixture market data' },
    };
  });
}

function readySnapshot() {
  const generatedAt = new Date();
  const tickers = ['NBIS', 'CRWV', 'ORCL', 'AVGO'];
  return {
    schemaVersion: 4,
    generatedAt: generatedAt.toISOString(),
    observations: tickers.flatMap(ticker => priceRows(ticker, generatedAt)),
    companyHistory: [{ ticker: 'NBIS', observedAt: generatedAt.toISOString(), origin: 'historical-reconstruction' }],
    backtestCoverage: { recorded: 1, reconstructed: 4 },
    methodologies: { companyScore: 'gridline-company-v1.0.0' },
    sourceHealth: { prices: { status: 'ok', recordCount: 280 } },
  };
}

test('demo readiness passes a schema-v4 snapshot with full price and reconstruction coverage', () => {
  const result = evaluateDemoReadiness(readySnapshot());
  assert.equal(result.ready, true);
  assert.equal(result.blockerCount, 0);
  assert.equal(result.priceCoverage.NBIS.count, 70);
});

test('demo readiness blocks the old zero-row price failure mode', () => {
  const snapshot = readySnapshot();
  snapshot.observations = [];
  snapshot.sourceHealth.prices = { status: 'ok', recordCount: 0 };
  const result = evaluateDemoReadiness(snapshot);
  assert.equal(result.ready, false);
  assert.ok(result.checks.some(item => item.id === 'healthy-source-prices' && !item.ok));
  assert.ok(result.checks.some(item => item.id === 'prices-NBIS' && !item.ok));
});

test('an empty verified event feed does not block a snapshot', () => {
  const snapshot = readySnapshot();
  snapshot.sourceHealth.events = { status: 'ok', recordCount: 0 };
  const result = evaluateDemoReadiness(snapshot);
  assert.equal(result.ready, true);
  assert.ok(result.checks.some(item => item.id === 'healthy-source-events' && item.ok));
});

test('optional degraded sources are visible warnings rather than demo blockers', () => {
  const snapshot = readySnapshot();
  snapshot.sourceHealth.pjm = { status: 'degraded', message: 'PJM_API_KEY is not configured.' };
  const result = evaluateDemoReadiness(snapshot);
  assert.equal(result.ready, true);
  assert.equal(result.warningCount, 1);
});

test('schema and reconstructed history are required for the finished demo gate', () => {
  const snapshot = readySnapshot();
  snapshot.schemaVersion = 3;
  snapshot.backtestCoverage.reconstructed = 0;
  const result = evaluateDemoReadiness(snapshot);
  assert.equal(result.ready, false);
  assert.ok(result.checks.some(item => item.id === 'schema-v4' && !item.ok));
  assert.ok(result.checks.some(item => item.id === 'reconstructed-history' && !item.ok));
});
