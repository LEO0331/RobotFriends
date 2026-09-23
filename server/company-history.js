const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_HISTORY_DAYS = 400;
const { VERSION } = require('./scoring/engine');

function isCurrentSignal(item) {
  return item?.methodologyVersion === VERSION && item?.origin !== 'historical-reconstruction' && item?.marketSignal?.available === true;
}

function normalizeSnapshot(company, observedAt) {
  return {
    ticker: company.ticker,
    observedAt,
    asOf: company.asOf || observedAt,
    emotion: null,
    fundamentals: null,
    exposure: null,
    gap: null,
    confidence: null,
    marketSignal: company.marketSignal,
    methodologyVersion: company.methodologyVersion,
    lineage: company.lineage || [],
    origin: company.origin || 'recorded',
    pointInTimeQuality: company.pointInTimeQuality || 'recorded',
    qualityNotes: company.qualityNotes || [],
    reconstructedAt: company.reconstructedAt || null,
    reconstructionVersion: company.reconstructionVersion || null,
  };
}

function mergeCompanyHistory(previous, companies, observedAt = new Date().toISOString()) {
  const asOf = Date.parse(observedAt);
  if (!Number.isFinite(asOf)) throw new Error('observedAt must be a valid ISO date');
  const cutoff = asOf - MAX_HISTORY_DAYS * DAY_MS;
  const byKey = new Map();
  for (const item of previous || []) {
    const time = Date.parse(item.observedAt);
    if (!item?.ticker || !Number.isFinite(time) || time < cutoff || !isCurrentSignal(item)) continue;
    byKey.set(`${item.ticker}:${String(item.observedAt).slice(0, 10)}`, item);
  }
  for (const company of companies || []) {
    if (!isCurrentSignal(company)) continue;
    const item = normalizeSnapshot(company, observedAt);
    byKey.set(`${item.ticker}:${observedAt.slice(0, 10)}`, item);
  }
  return [...byKey.values()].sort((a, b) => {
    const dateOrder = String(a.observedAt).localeCompare(String(b.observedAt));
    return dateOrder || String(a.ticker).localeCompare(String(b.ticker));
  });
}

module.exports = { mergeCompanyHistory, normalizeSnapshot, isCurrentSignal, MAX_HISTORY_DAYS };
