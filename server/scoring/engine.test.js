const test = require('node:test');
const assert = require('node:assert/strict');
const companies = require('../../src/data/companyExposure.json');
const { scoreCompany, scoreCompanies, VERSION } = require('./engine');

const company = companies.find(item => item.ticker === 'NBIS');

function closes(values, start = '2026-09-01') {
  const first = Date.parse(`${start}T20:00:00Z`);
  return values.map((value, index) => ({
    id: `price-${index}`,
    source: 'prices',
    type: 'close',
    ticker: 'NBIS',
    value,
    observedAt: new Date(first + index * 86400000).toISOString(),
    provenance: { originUrl: 'https://stooq.com/q/d/?s=nbis.us' },
  }));
}

test('scores expose only traceable MA5 and MA10 measurements', () => {
  const observations = closes([100, 101, 102, 103, 104, 105, 106, 107, 108, 109]);
  const result = scoreCompany(company, observations, '2026-09-10T23:00:00Z');
  assert.equal(result.methodologyVersion, VERSION);
  assert.equal(result.marketSignal.ma5, 107);
  assert.equal(result.marketSignal.ma10, 104.5);
  assert.equal(result.marketSignal.trend, 'above');
  assert.equal(result.marketSignal.observationCount, 10);
  assert.deepEqual(result.marketSignal.lineage, observations.map(item => item.id));
  assert.equal(result.marketSignal.sourceUrl, 'https://stooq.com/q/d/?s=nbis.us');
  for (const key of ['fundamentals', 'emotion', 'exposure', 'gap', 'confidence']) assert.equal(result[key], null);
});

test('score is unavailable rather than falling back to curated values', () => {
  const result = scoreCompany(company, closes([100, 101, 102, 103, 104]), '2026-09-10T23:00:00Z');
  assert.equal(result.marketSignal.available, false);
  assert.equal(result.marketSignal.reason, 'insufficient-price-history');
  assert.equal(result.marketSignal.ma5, null);
  assert.equal(result.marketSignal.ma10, null);
  assert.equal(result.marketSignal.trend, null);
});

test('historical cutoff excludes later quotes and rejects invalid prices', () => {
  const observations = [...closes([100, 101, 102, 103, 104, 105, 106, 107, 108, 109]),
    { ...closes([999], '2026-09-11')[0], id: 'future' },
    { ...closes([0], '2026-09-10')[0], id: 'invalid' }];
  const result = scoreCompany(company, observations, '2026-09-10T23:00:00Z');
  assert.equal(result.marketSignal.ma5, 107);
  assert.equal(result.marketSignal.ma10, 104.5);
  assert.ok(!result.lineage.includes('future'));
  assert.ok(!result.lineage.includes('invalid'));
});

test('all configured companies have no fabricated score when no observations exist', () => {
  const scores = scoreCompanies(companies, [], '2026-09-10T23:00:00Z');
  assert.equal(scores.length, companies.length);
  assert.ok(scores.every(item => item.marketSignal.available === false && item.fundamentals === null));
});
