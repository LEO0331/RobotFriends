const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseStooqHistory,
  parseYahooHistory,
  validateHistory,
  fetchTickerHistory,
} = require('./price-history');

function yahooFixture(count = 70, end = '2026-09-15') {
  const endMs = Date.parse(`${end}T00:00:00.000Z`);
  const timestamps = [];
  const close = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    timestamps.push(Math.floor((endMs - index * 24 * 60 * 60 * 1000) / 1000));
    close.push(100 + (count - index));
  }
  return { chart: { result: [{ timestamp: timestamps, indicators: { quote: [{ close }] } }], error: null } };
}

test('Stooq CSV parser accepts dated positive closing prices', () => {
  assert.deepEqual(parseStooqHistory('Date,Open,High,Low,Close,Volume\n2026-09-15,10,12,9,11.5,100\n'), [{ date: '2026-09-15', close: 11.5 }]);
  assert.deepEqual(parseStooqHistory('No data'), []);
});

test('Yahoo chart parser converts timestamps to daily closing rows', () => {
  const rows = parseYahooHistory(yahooFixture(2));
  assert.equal(rows.length, 2);
  assert.equal(rows[1].date, '2026-09-15');
  assert.ok(rows[1].close > 0);
});

test('history validation rejects empty, undersized and stale datasets', () => {
  assert.throws(() => validateHistory([], 'NBIS', { now: new Date('2026-09-16T00:00:00Z'), minRows: 1 }), /returned 0 usable daily rows/);
  assert.throws(() => validateHistory([{ date: '2026-09-15', close: 10 }], 'NBIS', { now: new Date('2026-09-16T00:00:00Z'), minRows: 2 }), /at least 2/);
  assert.throws(() => validateHistory([{ date: '2026-08-01', close: 10 }], 'NBIS', { now: new Date('2026-09-16T00:00:00Z'), minRows: 1, maxStalenessDays: 10 }), /days stale/);
});

test('price loader falls back to Yahoo when Stooq returns zero rows', async () => {
  const calls = [];
  const result = await fetchTickerHistory({
    ticker: 'AVGO',
    priceBaseUrl: 'https://stooq.example/q/d/l/',
    priceFallbackBaseUrl: 'https://query.example/v8/finance/chart',
    now: new Date('2026-09-16T00:00:00Z'),
    getText: async url => { calls.push(url); return 'No data'; },
    getJson: async url => { calls.push(url); return yahooFixture(); },
  });
  assert.equal(result.provider, 'Yahoo Finance');
  assert.equal(result.rows.length, 70);
  assert.equal(calls.length, 2);
});

test('price loader fails closed when both providers have no usable history', async () => {
  await assert.rejects(() => fetchTickerHistory({
    ticker: 'NBIS',
    priceBaseUrl: 'https://stooq.example/q/d/l/',
    priceFallbackBaseUrl: 'https://query.example/v8/finance/chart',
    now: new Date('2026-09-16T00:00:00Z'),
    getText: async () => 'No data',
    getJson: async () => ({ chart: { result: null, error: null } }),
  }), /No usable price history for NBIS/);
});
