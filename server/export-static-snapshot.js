const fs = require('fs/promises');
const path = require('path');
const config = require('./config');
const { createService } = require('./service');
const { mergeCompanyHistory } = require('./company-history');
const { scoreCompanies, VERSION: companyScoreVersion } = require('./scoring/engine');
const companies = require('../src/data/companyExposure.json');

const output = path.resolve(__dirname, '..', 'public', 'data', 'dashboard-snapshot.json');
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function readPrevious() { try { return JSON.parse(await fs.readFile(output, 'utf8')); } catch { return { observations: [], sourceHealth: {}, companyHistory: [], scores: [] }; } }
async function refreshWithRetry(service, source, attempts = 3) {
  let result;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await service.ingest(source, true);
    if (result.status === 'ok') return { ...result, attempts: attempt };
    if (attempt < attempts) await delay(1000 * (2 ** (attempt - 1)));
  }
  return { ...result, attempts };
}
async function main() {
  const service = createService(config); const previous = await readPrevious(); const outcomes = [];
  for (const source of config.scheduleSources) outcomes.push(await refreshWithRetry(service, source));
  const fresh = await service.observations(); const health = await service.health();
  const successful = new Set(outcomes.filter(item => item.status === 'ok').map(item => item.source));
  const retained = (previous.observations || []).filter(item => !successful.has(item.source));
  const observations = [...retained, ...fresh];
  const generatedAt = new Date().toISOString();
  const scores = scoreCompanies(companies, observations, generatedAt);
  const scoreSnapshots = scores.map(score => ({
    ticker: score.ticker,
    emotion: score.emotion,
    fundamentals: score.fundamentals,
    exposure: score.exposure,
    gap: score.gap,
    confidence: score.confidence,
  }));
  const companyHistory = mergeCompanyHistory(previous.companyHistory || [], scoreSnapshots, generatedAt);
  const snapshot = {
    schemaVersion: 3,
    generatedAt,
    freshness: outcomes.every(item => item.status === 'ok') ? 'fresh' : successful.size ? 'partial' : 'stale',
    sourceHealth: health,
    outcomes,
    observations,
    scores,
    methodologies: { companyScore: companyScoreVersion },
    companyHistory,
    note: 'Static dashboard snapshot. External observations carry provenance, derived scores carry methodology versions and lineage, and historical scores are stored point-in-time to avoid look-ahead bias. Not investment advice.',
  };
  await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify({ freshness: snapshot.freshness, companyHistoryRecords: companyHistory.length, methodology: companyScoreVersion, sources: outcomes.map(item => ({ source: item.source, status: item.status, attempts: item.attempts })) }, null, 2));
}
main().catch(error => { console.error(error); process.exit(1); });
