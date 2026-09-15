const fs = require('fs/promises');
const path = require('path');
const config = require('./config');
const { createService } = require('./service');

const output = path.resolve(__dirname, '..', 'public', 'data', 'dashboard-snapshot.json');
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function readPrevious() { try { return JSON.parse(await fs.readFile(output, 'utf8')); } catch { return { observations: [], sourceHealth: {} }; } }
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
  const snapshot = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    freshness: outcomes.every(item => item.status === 'ok') ? 'fresh' : successful.size ? 'partial' : 'stale',
    sourceHealth: health,
    outcomes,
    observations: [...retained, ...fresh],
    note: 'Static demo snapshot. Values are point-in-time observations and not investment advice.',
  };
  await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify({ freshness: snapshot.freshness, sources: outcomes.map(item => ({ source: item.source, status: item.status, attempts: item.attempts })) }, null, 2));
}
main().catch(error => { console.error(error); process.exit(1); });
