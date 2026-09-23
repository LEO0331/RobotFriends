const { VERSION, METHODOLOGY } = require('./methodology-v2');

const round = value => Math.round(value * 10000) / 10000;

function priceRows(observations, ticker, asOf) {
  const cutoff = Date.parse(asOf);
  if (!Number.isFinite(cutoff)) throw new Error('asOf must be a valid ISO date');
  const byDay = new Map();
  for (const item of observations || []) {
    const time = Date.parse(item?.observedAt);
    if (item?.source !== 'prices' || item.type !== 'close' || item.ticker !== ticker ||
        !Number.isFinite(time) || time > cutoff || !Number.isFinite(Number(item.value)) || Number(item.value) <= 0) continue;
    const day = item.observedAt.slice(0, 10);
    const existing = byDay.get(day);
    if (!existing || Date.parse(existing.observedAt) < time) byDay.set(day, item);
  }
  return [...byDay.values()].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
}

function averagePrice(rows) {
  return round(rows.reduce((sum, row) => sum + Number(row.value), 0) / rows.length);
}

function marketSignal(observations, ticker, asOf) {
  const rows = priceRows(observations, ticker, asOf);
  if (rows.length < METHODOLOGY.longWindow) {
    return {
      available: false, reason: 'insufficient-price-history', trend: null,
      ma5: null, ma10: null, spreadPct: null,
      observationCount: rows.length, observedAt: rows.at(-1)?.observedAt || null,
      sourceUrl: null, lineage: [],
    };
  }
  const used = rows.slice(-METHODOLOGY.longWindow);
  const sourceUrls = [...new Set(used.map(row => row.provenance?.originUrl || row.sourceUrl).filter(Boolean))];
  if (sourceUrls.length !== 1) {
    return {
      available: false, reason: 'missing-or-mixed-price-reference', trend: null,
      ma5: null, ma10: null, spreadPct: null,
      observationCount: rows.length, observedAt: used.at(-1).observedAt,
      sourceUrl: null, lineage: [],
    };
  }
  const ma5 = averagePrice(used.slice(-METHODOLOGY.shortWindow));
  const ma10 = averagePrice(used);
  const close = Number(used.at(-1).value);
  return {
    available: true,
    reason: null,
    trend: close > ma5 && ma5 > ma10 ? 'above' : close < ma5 && ma5 < ma10 ? 'below' : 'mixed',
    ma5,
    ma10,
    spreadPct: round((ma5 / ma10 - 1) * 100),
    observationCount: rows.length,
    observedAt: used.at(-1).observedAt,
    sourceUrl: sourceUrls[0],
    lineage: used.map(row => row.id).filter(Boolean),
  };
}

function scoreCompany(company, observations = [], asOf = new Date().toISOString()) {
  const signal = marketSignal(observations, company.ticker, asOf);
  return {
    ticker: company.ticker,
    name: company.name,
    methodologyVersion: VERSION,
    asOf,
    calculatedAt: new Date().toISOString(),
    fundamentals: null,
    emotion: null,
    exposure: null,
    gap: null,
    confidence: null,
    marketSignal: signal,
    scores: { marketSignal: signal },
    lineage: signal.lineage,
    provenance: {
      methodologyVersion: VERSION,
      sourceUrl: signal.sourceUrl,
      lineage: signal.lineage,
      pointInTimeCutoff: asOf,
      formula: METHODOLOGY.formula,
    },
  };
}

function scoreCompanies(companies, observations = [], asOf = new Date().toISOString()) {
  return (companies || []).map(company => scoreCompany(company, observations, asOf));
}

module.exports = { scoreCompany, scoreCompanies, marketSignal, priceRows, VERSION };
