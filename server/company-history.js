const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_HISTORY_DAYS = 400;

function normalizeSnapshot(company, observedAt) {
  return {
    ticker: company.ticker,
    observedAt,
    asOf: company.asOf || observedAt,
    emotion: Number(company.emotion),
    fundamentals: Number(company.fundamentals),
    exposure: Number(company.exposure),
    gap: company.gap,
    confidence: Number(company.confidence || 0),
    methodologyVersion: company.methodologyVersion || 'recorded-snapshot',
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
    if (!item?.ticker || !Number.isFinite(time) || time < cutoff) continue;
    byKey.set(`${item.ticker}:${String(item.observedAt).slice(0, 10)}`, item);
  }
  for (const company of companies || []) {
    const item = normalizeSnapshot(company, observedAt);
    byKey.set(`${item.ticker}:${observedAt.slice(0, 10)}`, item);
  }
  return [...byKey.values()].sort((a, b) => {
    const dateOrder = String(a.observedAt).localeCompare(String(b.observedAt));
    return dateOrder || String(a.ticker).localeCompare(String(b.ticker));
  });
}

module.exports = { mergeCompanyHistory, normalizeSnapshot, MAX_HISTORY_DAYS };
