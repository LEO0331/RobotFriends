const { scoreCompanies } = require('./scoring/engine');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_START = '2026-06-01';
const DEFAULT_CADENCE_DAYS = 7;
const RECONSTRUCTION_VERSION = 'gridline-historical-reconstruction-v1.0.0';

function endOfUtcDay(value) {
  const raw = String(value || '').slice(0, 10);
  const time = Date.parse(`${raw}T23:59:59.999Z`);
  if (!Number.isFinite(time)) throw new Error(`Invalid reconstruction date: ${value}`);
  return new Date(time).toISOString();
}

function previousUtcDay(value) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error('generatedAt must be a valid ISO date');
  return new Date(Date.UTC(
    new Date(time).getUTCFullYear(),
    new Date(time).getUTCMonth(),
    new Date(time).getUTCDate() - 1,
    23, 59, 59, 999,
  )).toISOString();
}

function mergeReconstructedHistory(previous = [], reconstructed = []) {
  const byKey = new Map();
  for (const item of previous || []) {
    if (!item?.ticker || !item?.observedAt) continue;
    byKey.set(`${item.ticker}:${String(item.observedAt).slice(0, 10)}`, item);
  }
  for (const item of reconstructed || []) {
    if (!item?.ticker || !item?.observedAt) continue;
    const key = `${item.ticker}:${String(item.observedAt).slice(0, 10)}`;
    if (!byKey.has(key)) byKey.set(key, item);
  }
  return [...byKey.values()].sort((a, b) => {
    const dateOrder = String(a.observedAt).localeCompare(String(b.observedAt));
    return dateOrder || String(a.ticker).localeCompare(String(b.ticker));
  });
}

function reconstructCompanyHistory({
  companies,
  observations,
  generatedAt = new Date().toISOString(),
  startDate = process.env.BACKTEST_RECONSTRUCTION_START || DEFAULT_START,
  cadenceDays = Number(process.env.BACKTEST_RECONSTRUCTION_CADENCE_DAYS || DEFAULT_CADENCE_DAYS),
} = {}) {
  const start = Date.parse(endOfUtcDay(startDate));
  const end = Date.parse(previousUtcDay(generatedAt));
  const stepDays = Number.isFinite(cadenceDays) && cadenceDays > 0 ? cadenceDays : DEFAULT_CADENCE_DAYS;
  const reconstructedAt = new Date().toISOString();
  const rows = [];
  if (start > end) return rows;

  for (let cursor = start; cursor <= end; cursor += stepDays * DAY_MS) {
    const asOf = new Date(cursor).toISOString();
    const scores = scoreCompanies(companies || [], observations || [], asOf);
    for (const score of scores) {
      // Avoid manufacturing historical emotion from a present-day fallback. A demo
      // reconstruction is emitted only when real historical market observations
      // support the market-emotion calculation at that cutoff.
      if (score.scores?.marketEmotion?.mode !== 'market-history') continue;
      rows.push({
        ticker: score.ticker,
        observedAt: asOf,
        asOf,
        emotion: score.emotion,
        fundamentals: score.fundamentals,
        exposure: score.exposure,
        gap: score.gap,
        confidence: score.confidence,
        methodologyVersion: score.methodologyVersion,
        lineage: score.lineage || [],
        origin: 'historical-reconstruction',
        reconstructedAt,
        reconstructionVersion: RECONSTRUCTION_VERSION,
        pointInTimeQuality: 'partial',
        qualityNotes: [
          'External observations are restricted to records observed at or before the historical cutoff.',
          'Market emotion requires historical price coverage and never uses the curated fallback in reconstructed rows.',
          'Fundamental component inputs and structural exposure are methodology-v1 curated constants without historical-vintage metadata.',
        ],
      });
    }
  }
  return rows;
}

function reconstructionSummary(history = []) {
  const reconstructed = history.filter(item => item.origin === 'historical-reconstruction');
  const recorded = history.filter(item => item.origin !== 'historical-reconstruction');
  const dates = history.map(item => String(item.observedAt || item.asOf || '').slice(0, 10)).filter(Boolean).sort();
  return {
    start: dates[0] || null,
    end: dates[dates.length - 1] || null,
    recorded: recorded.length,
    reconstructed: reconstructed.length,
    reconstructionVersion: reconstructed[0]?.reconstructionVersion || null,
    reconstructionQuality: reconstructed.length ? 'partial' : 'recorded-only',
  };
}

module.exports = {
  DEFAULT_START,
  DEFAULT_CADENCE_DAYS,
  RECONSTRUCTION_VERSION,
  reconstructCompanyHistory,
  mergeReconstructedHistory,
  reconstructionSummary,
};
