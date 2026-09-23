const fs = require('fs/promises');
const path = require('path');
const { getText } = require('./http');

const PJM_FEED = 'https://insidelines.pjm.com/feed/';
const CANDIDATES_FILE = path.join(__dirname, 'event-candidates.json');
const PROVIDERS = {
  PJM: { hosts: ['insidelines.pjm.com'], paths: [/^\/.+\/$/] },
  ERCOT: { hosts: ['www.ercot.com'], paths: [/^\/news\/release\//] },
  Loudoun: { hosts: ['www.loudoun.gov'], paths: [/^\/(?:CivicAlerts|AgendaCenter|DocumentCenter|ArchiveCenter)/i, /^\/m\/newsflash\/home\/detail\/\d+$/i] },
  Oracle: { hosts: ['investor.oracle.com'], paths: [/^\/investor-news\/news-details\//] },
};
const CATEGORIES = new Set(['POWER', 'GRID', 'PERMIT', 'CAPEX']);

function plain(value) {
  return String(value || '').replace(/^<!\[CDATA\[|\]\]>$/g, '')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
    .replace(/&(?:amp|quot|apos|lt|gt|nbsp);/gi, token => ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' })[token.toLowerCase()] || token)
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function rssValue(item, tag) {
  return plain(item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]);
}

function categoryFor(title) {
  if (/interconnection|transmission|large load|data cent(?:er|re)|grid reliability/i.test(title)) return 'GRID';
  if (/load forecast|electricity demand|generation|capacity auction|resource adequacy|power capacity/i.test(title)) return 'POWER';
  return null;
}

function parsePjmFeed(xml) {
  return [...String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(([, item]) => {
    const title = rssValue(item, 'title');
    const date = new Date(rssValue(item, 'pubDate'));
    return { source: 'PJM', title, category: categoryFor(title), publishedAt: Number.isFinite(date.getTime()) ? date.toISOString() : null, url: rssValue(item, 'link'), region: 'PJM region' };
  }).filter(item => item.category && item.publishedAt);
}

function validCandidate(item, now = new Date()) {
  if (!item || !PROVIDERS[item.source] || !CATEGORIES.has(item.category) || typeof item.title !== 'string' || item.title.trim().length < 12 || !item.region) return false;
  if (item.summary && (typeof item.summary !== 'string' || typeof item.evidenceText !== 'string' || item.evidenceText.length < 12)) return false;
  const date = Date.parse(item.publishedAt);
  if (!Number.isFinite(date) || date > now.getTime()) return false;
  try {
    const url = new URL(item.url);
    const provider = PROVIDERS[item.source];
    return url.protocol === 'https:' && !url.username && !url.password && provider.hosts.includes(url.hostname) && provider.paths.some(pattern => pattern.test(url.pathname));
  } catch { return false; }
}

function pageMatchesTitle(html, title) {
  const normalize = value => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const expected = normalize(title);
  const headings = [...String(html).matchAll(/<h([1-3])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi)].map(match => plain(match[2]));
  const pageTitle = plain(html.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i)?.[1]);
  return expected.length >= 12 && [...headings, pageTitle].some(heading => {
    const actual = normalize(heading);
    return actual.includes(expected) || (expected.includes(actual) && actual.length >= 12);
  });
}

function pageSupportsEvidence(html, evidenceText) {
  if (!evidenceText) return true;
  const normalize = value => plain(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return normalize(html).includes(normalize(evidenceText));
}

async function ingestEvents(config = {}, dependencies = {}) {
  const read = dependencies.getText || getText;
  const readFile = dependencies.readFile || (file => fs.readFile(file, 'utf8'));
  const now = dependencies.now || new Date();
  const headers = { 'User-Agent': config.secUserAgent || 'Gridline event research dashboard' };
  let curated = [];
  try { curated = JSON.parse(await readFile(CANDIDATES_FILE)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!Array.isArray(curated)) throw new Error('Event candidates must be a JSON array.');
  let discovered = [];
  let feedError = null;
  try { discovered = parsePjmFeed(await read(PJM_FEED, { ...headers, Accept: 'application/rss+xml, application/xml' })); } catch (error) { feedError = error.message; }
  const accepted = [];
  const rejected = [];
  for (const item of [...discovered, ...curated]) {
    if (!validCandidate(item, now)) { rejected.push({ title: item?.title || '', reason: 'invalid metadata or non-primary URL' }); continue; }
    try {
      const html = await read(item.url, { ...headers, Accept: 'text/html' });
      if (!pageMatchesTitle(html, item.title)) { rejected.push({ title: item.title, reason: 'record title mismatch' }); continue; }
      if (!pageSupportsEvidence(html, item.evidenceText)) { rejected.push({ title: item.title, reason: 'supporting text missing' }); continue; }
      accepted.push(item);
    } catch (error) { rejected.push({ title: item.title, reason: `record inaccessible: ${error.message}` }); }
  }
  const unique = [...new Map(accepted.map(item => [item.url, item])).values()];
  if (feedError && !unique.length) throw new Error(`PJM event feed unavailable and no curated records passed validation: ${feedError}`);
  return {
    payload: { discovered: discovered.length, curated: curated.length, accepted: unique.length, rejected, feedError },
    observations: unique.map(item => ({ source: 'events', type: 'infrastructureEvent', value: item, observedAt: item.publishedAt, retrievedAt: now.toISOString(), sourceUrl: item.url, region: item.region, confidence: 1 })),
    message: `${unique.length} verified infrastructure event records; ${rejected.length} rejected${feedError ? '; PJM feed unavailable' : ''}`,
  };
}

module.exports = { ingestEvents, parsePjmFeed, validCandidate, pageMatchesTitle, pageSupportsEvidence, categoryFor, PJM_FEED };
