const fs = require('fs/promises');
const path = require('path');
const config = require('./config');
const { createService } = require('./service');
const { mergeCompanyHistory } = require('./company-history');
const companies = require('../src/data/companyExposure.json');

const output = path.resolve(__dirname, '..', 'public', 'data', 'dashboard-snapshot.json');
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function readPrevious() { try { return JSON.parse(await fs.readFile(output, 'utf8')); } catch { return { observations: [], sourceHealth: {}, companyHistory: [] }; } }
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
  const generatedAt = new Date().toISOString();
  const companyHistory = mergeCompanyHistory(previous.companyHistory || [], companies, generatedAt);
  const snapshot = {
    schemaVersion: 2,
    generatedAt,
    freshness: outcomes.every(item => item.status === 'ok') ? 'fresh' : successful.size ? 'partial' : 'stale',
    sourceHealth: health,
    outcomes,
    observations: [...retained, ...fresh],
    companyHistory,
    note: 'Static dashboard snapshot. Market prices retain source observation dates; proprietary company scores are stored as point-in-time daily snapshots to avoid look-ahead bias. Not investment advice.',
  };
  await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify({ freshness: snapshot.freshness, companyHistoryRecords: companyHistory.length, sources: outcomes.map(item => ({ source: item.source, status: item.status, attempts: item.attempts })) }, null, 2));
}
main().catch(error => { console.error(error); process.exit(1); });
