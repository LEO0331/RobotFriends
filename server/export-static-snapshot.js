const fs = require('fs/promises');
const path = require('path');
const config = require('./config');
const { createService } = require('./service');
const { mergeCompanyHistory } = require('./company-history');
const { mergeSnapshotObservations, mergeSnapshotHealth } = require('./snapshot-merge');
const { evaluateDemoReadiness } = require('./demo-readiness');
const {
  reconstructCompanyHistory,
  mergeReconstructedHistory,
  reconstructionSummary,
} = require('./historical-reconstruction');
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
  const fresh = await service.observations();
  const currentHealth = await service.health();
  const successful = new Set(outcomes.filter(item => item.status === 'ok').map(item => item.source));
  const observations = mergeSnapshotObservations(previous.observations || [], fresh, outcomes);
  const health = mergeSnapshotHealth(previous.sourceHealth || {}, currentHealth, observations);
  const generatedAt = new Date().toISOString();
  const scores = scoreCompanies(companies, observations, generatedAt);
  const scoreSnapshots = scores.map(score => ({
    ticker: score.ticker,
    asOf: score.asOf,
    emotion: score.emotion,
    fundamentals: score.fundamentals,
    exposure: score.exposure,
    gap: score.gap,
    confidence: score.confidence,
    methodologyVersion: score.methodologyVersion,
    lineage: score.lineage || [],
    origin: 'recorded',
    pointInTimeQuality: 'recorded',
  }));

  const reconstructionEnabled = process.env.BACKTEST_DEMO_RECONSTRUCTION !== 'false';
  const reconstructed = reconstructionEnabled
    ? reconstructCompanyHistory({ companies, observations, generatedAt })
    : [];
  const historyWithReconstruction = mergeReconstructedHistory(previous.companyHistory || [], reconstructed);
  const companyHistory = mergeCompanyHistory(historyWithReconstruction, scoreSnapshots, generatedAt);
  const backtestCoverage = reconstructionSummary(companyHistory);

  await service.store.saveScoreSnapshots(scores);
  if (reconstructed.length) {
    const existingScores = await service.store.scoreSnapshots({});
    const existingKeys = new Set(existingScores.map(item => `${item.ticker}:${item.asOf}:${item.methodologyVersion}`));
    const newReconstructed = reconstructed.filter(item => !existingKeys.has(`${item.ticker}:${item.asOf}:${item.methodologyVersion}`));
    if (newReconstructed.length) {
      await service.store.saveScoreSnapshots(newReconstructed.map(item => ({
        ...item,
        calculatedAt: item.reconstructedAt,
        provenance: {
          methodologyVersion: item.methodologyVersion,
          lineage: item.lineage,
          pointInTimeCutoff: item.asOf,
          origin: item.origin,
          pointInTimeQuality: item.pointInTimeQuality,
          qualityNotes: item.qualityNotes,
        },
      })));
    }
  }

  const snapshot = {
    schemaVersion: 4,
    generatedAt,
    freshness: outcomes.every(item => item.status === 'ok') ? 'fresh' : successful.size ? 'partial' : 'stale',
    sourceHealth: health,
    outcomes,
    observations,
    scores,
    methodologies: { companyScore: companyScoreVersion },
    companyHistory,
    backtestCoverage,
    note: 'Static dashboard snapshot. Successful sources replace their prior static data; degraded sources retain last-known-good observations and last-success metadata. Recorded scores are native point-in-time observations. Demo historical reconstructions are clearly labeled and enforce historical observation cutoffs; they remain partial because methodology-v1 fundamental and structural-exposure inputs do not yet have historical vintages. Not investment advice.',
  };
  const readiness = evaluateDemoReadiness(snapshot, { tickers: config.tickers, now: generatedAt });
  snapshot.demoReadiness = {
    status: readiness.status,
    ready: readiness.ready,
    blockerCount: readiness.blockerCount,
    warningCount: readiness.warningCount,
    priceCoverage: readiness.priceCoverage,
  };
  await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify({
    freshness: snapshot.freshness,
    demoReadiness: snapshot.demoReadiness,
    companyHistoryRecords: companyHistory.length,
    reconstructedRecords: backtestCoverage.reconstructed,
    backtestCoverage,
    methodology: companyScoreVersion,
    sources: outcomes.map(item => ({ source: item.source, status: item.status, attempts: item.attempts, recordCount: item.recordCount ?? null, message: item.message })),
  }, null, 2));
}
main().catch(error => { console.error(error); process.exit(1); });
