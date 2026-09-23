const test = require('node:test');
const assert = require('node:assert/strict');
const candidates = require('./event-candidates.json');
const { ingestEvents, parsePjmFeed, validCandidate, pageMatchesTitle, pageSupportsEvidence, PJM_FEED } = require('./event-ingestion');

const articleUrl = 'https://insidelines.pjm.com/pjm-updates-large-load-interconnection/';
const feed = `<rss><channel><item><title>PJM Updates Large Load Interconnection Process</title><link>${articleUrl}</link><pubDate>Tue, 22 Sep 2026 14:00:00 GMT</pubDate></item><item><title>PJM Names New Executive</title><link>https://insidelines.pjm.com/executive/</link><pubDate>Tue, 22 Sep 2026 14:00:00 GMT</pubDate></item></channel></rss>`;

test('PJM feed proposes only relevant primary-source articles', () => {
  const items = parsePjmFeed(feed);
  assert.equal(items.length, 1);
  assert.equal(items[0].category, 'GRID');
  assert.equal(items[0].url, articleUrl);
});

test('event admission rejects generic and mismatched links', () => {
  const candidate = parsePjmFeed(feed)[0];
  assert.equal(validCandidate(candidate, new Date('2026-09-23T00:00:00Z')), true);
  assert.equal(validCandidate({ ...candidate, url: 'https://insidelines.pjm.com/' }, new Date('2026-09-23T00:00:00Z')), false);
  assert.equal(validCandidate({ ...candidate, url: 'https://example.com/story' }, new Date('2026-09-23T00:00:00Z')), false);
  assert.equal(pageMatchesTitle('<h1>Unrelated story</h1>', candidate.title), false);
  assert.equal(pageSupportsEvidence('<p>Unrelated content</p>', 'delivery of 850MW additional datacenter capacity'), false);
});

test('curated candidates carry specific primary-source URLs and publication dates', () => {
  assert.equal(candidates.length, 3);
  for (const item of candidates) assert.equal(validCandidate(item, new Date('2026-09-23T00:00:00Z')), true);
});

test('ingestion publishes only a reachable article whose heading matches the feed title', async () => {
  const result = await ingestEvents({}, {
    now: new Date('2026-09-23T00:00:00Z'),
    readFile: async () => '[]',
    getText: async url => url === PJM_FEED ? feed : '<h1>PJM Updates Large Load Interconnection Process</h1>',
  });
  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].sourceUrl, articleUrl);
  assert.equal(result.observations[0].value.title, 'PJM Updates Large Load Interconnection Process');
});

test('inaccessible candidate is withheld', async () => {
  const result = await ingestEvents({}, {
    now: new Date('2026-09-23T00:00:00Z'),
    readFile: async () => '[]',
    getText: async url => { if (url === PJM_FEED) return feed; throw new Error('403 Forbidden'); },
  });
  assert.equal(result.observations.length, 0);
  assert.match(result.payload.rejected[0].reason, /inaccessible/);
});
