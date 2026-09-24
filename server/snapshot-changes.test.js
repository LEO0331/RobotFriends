const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CURRENT_EVENT_DAYS,
  VERSION,
  buildSnapshotChanges,
  isArchived,
} = require('./snapshot-changes');

const price = (id, ticker, date, value, provider = 'Fixture') => ({
  id,
  source: 'prices',
  type: 'close',
  ticker,
  observedAt: `${date}T20:00:00.000Z`,
  retrievedAt: `${date}T22:00:00.000Z`,
  value,
  provenance: { provider, originUrl: `https://example.com/${ticker.toLowerCase()}` },
});

const score = (ticker, state, observedAt, available = true) => ({
  ticker,
  methodologyVersion: 'price-ma5-ma10-v2',
  marketSignal: {
    available,
    trend: available ? state : null,
    observedAt,
    sourceUrl: available ? `https://example.com/${ticker.toLowerCase()}` : null,
  },
});

const event = (id, url, title, publishedAt, retrievedAt, extra = {}) => ({
  id,
  source: 'events',
  type: 'infrastructureEvent',
  observedAt: publishedAt,
  retrievedAt,
  value: {
    title,
    category: 'GRID',
    region: 'Texas',
    publishedAt,
    source: 'Fixture authority',
    url,
    summary: 'Verified development',
    ...extra,
  },
});

test('builds a deterministic customer-facing diff for price, signal, event and health changes', () => {
  const previous = {
    generatedAt: '2026-09-23T22:00:00.000Z',
    observations: [
      price('p1', 'NBIS', '2026-09-22', 100),
      event('e1', 'https://example.com/event-1', 'Existing event', '2026-09-10T12:00:00.000Z', '2026-09-23T20:00:00.000Z'),
    ],
    scores: [score('NBIS', 'mixed', '2026-09-22T20:00:00.000Z')],
    sourceHealth: {
      prices: { status: 'ok', checkedAt: '2026-09-23T22:00:00.000Z' },
      events: { status: 'partial', checkedAt: '2026-09-23T22:00:00.000Z' },
    },
  };
  const current = {
    generatedAt: '2026-09-24T22:00:00.000Z',
    observations: [
      price('p2', 'NBIS', '2026-09-23', 105),
      event('e1', 'https://example.com/event-1', 'Existing event', '2026-09-10T12:00:00.000Z', '2026-09-23T20:00:00.000Z'),
      event('e2', 'https://example.com/event-2', 'New verified project', '2026-09-24T10:00:00.000Z', '2026-09-24T20:00:00.000Z'),
    ],
    scores: [score('NBIS', 'above', '2026-09-23T20:00:00.000Z')],
    sourceHealth: {
      prices: { status: 'ok', checkedAt: '2026-09-24T22:00:00.000Z' },
      events: { status: 'ok', checkedAt: '2026-09-24T22:00:00.000Z' },
    },
  };

  const result = buildSnapshotChanges(previous, current, { tickers: ['NBIS'] });

  assert.equal(result.version, VERSION);
  assert.equal(result.available, true);
  assert.equal(result.from, previous.generatedAt);
  assert.equal(result.to, current.generatedAt);
  assert.deepEqual(result.summary, {
    total: 4,
    price: 1,
    signal: 1,
    event: 1,
    sourceHealth: 1,
  });

  assert.deepEqual(result.changes.map(item => item.type), [
    'event-added',
    'signal',
    'price',
    'source-health',
  ]);

  const priceChange = result.changes.find(item => item.type === 'price');
  assert.equal(priceChange.ticker, 'NBIS');
  assert.equal(priceChange.before, 100);
  assert.equal(priceChange.after, 105);
  assert.equal(priceChange.sourceUrl, 'https://example.com/nbis');

  const signalChange = result.changes.find(item => item.type === 'signal');
  assert.equal(signalChange.before, 'mixed');
  assert.equal(signalChange.after, 'above');
  assert.equal(signalChange.afterAvailable, true);

  const newEvent = result.changes.find(item => item.type === 'event-added');
  assert.equal(newEvent.title, 'New verified project');
  assert.equal(newEvent.sourceUrl, 'https://example.com/event-2');

  const health = result.changes.find(item => item.type === 'source-health');
  assert.deepEqual({ source: health.source, before: health.before, after: health.after }, {
    source: 'events',
    before: 'partial',
    after: 'ok',
  });
});

test('reports availability changes in the recorded trend signal without inventing a state', () => {
  const previous = {
    generatedAt: '2026-09-23T22:00:00.000Z',
    scores: [score('NBIS', null, null, false)],
  };
  const current = {
    generatedAt: '2026-09-24T22:00:00.000Z',
    scores: [score('NBIS', 'below', '2026-09-24T20:00:00.000Z')],
  };

  const result = buildSnapshotChanges(previous, current, { tickers: ['NBIS'] });
  const change = result.changes.find(item => item.type === 'signal');

  assert.equal(change.before, null);
  assert.equal(change.beforeAvailable, false);
  assert.equal(change.after, 'below');
  assert.equal(change.afterAvailable, true);
});

test('detects event updates and archive transitions against the prior snapshot time', () => {
  const publishedAt = '2026-08-04T12:00:00.000Z';
  const previous = {
    generatedAt: '2026-09-02T11:00:00.000Z',
    observations: [
      event('old', 'https://example.com/archive-me', 'Original title', publishedAt, '2026-09-02T10:00:00.000Z'),
    ],
  };
  const current = {
    generatedAt: '2026-09-03T13:00:00.000Z',
    observations: [
      event('new', 'https://example.com/archive-me', 'Updated title', publishedAt, '2026-09-03T12:00:00.000Z'),
    ],
  };

  assert.equal(CURRENT_EVENT_DAYS, 30);
  assert.equal(isArchived(previous.observations[0].value, previous.generatedAt), false);
  assert.equal(isArchived(current.observations[0].value, current.generatedAt), true);

  const result = buildSnapshotChanges(previous, current, { tickers: [] });
  assert.deepEqual(result.changes.map(item => item.type), ['event-updated', 'event-archived']);
  assert.equal(result.summary.event, 2);
});

test('does not emit a price change when the latest dated close is unchanged', () => {
  const row = price('same', 'NBIS', '2026-09-23', 100);
  const previous = {
    generatedAt: '2026-09-23T22:00:00.000Z',
    observations: [row],
  };
  const current = {
    generatedAt: '2026-09-24T22:00:00.000Z',
    observations: [row],
  };

  const result = buildSnapshotChanges(previous, current, { tickers: ['NBIS'] });
  assert.equal(result.changes.some(item => item.type === 'price'), false);
});

test('fails closed when there is no valid previous snapshot baseline', () => {
  const result = buildSnapshotChanges(
    { observations: [] },
    { generatedAt: '2026-09-24T22:00:00.000Z', observations: [] },
    { tickers: ['NBIS'] },
  );

  assert.deepEqual(result, {
    version: VERSION,
    available: false,
    reason: 'previous-snapshot-unavailable',
    from: null,
    to: '2026-09-24T22:00:00.000Z',
    changes: [],
    summary: { total: 0, price: 0, signal: 0, event: 0, sourceHealth: 0 },
  });
});

test('uses the most recently retrieved observation when a price date is duplicated', () => {
  const previous = {
    generatedAt: '2026-09-23T22:00:00.000Z',
    observations: [price('old', 'NBIS', '2026-09-22', 100)],
  };
  const first = price('a', 'NBIS', '2026-09-23', 101);
  const corrected = price('b', 'NBIS', '2026-09-23', 102);
  first.retrievedAt = '2026-09-23T20:00:00.000Z';
  corrected.retrievedAt = '2026-09-23T21:00:00.000Z';
  const current = {
    generatedAt: '2026-09-24T22:00:00.000Z',
    observations: [first, corrected],
  };

  const result = buildSnapshotChanges(previous, current, { tickers: ['NBIS'] });
  const change = result.changes.find(item => item.type === 'price');
  assert.equal(change.after, 102);
});
