const { VERSION, FUNDAMENTAL_WEIGHTS, COMPANY_INPUTS, SCORE_DESCRIPTIONS } = require('./methodology-v1');
const { provenanceSummary } = require('../provenance');

const DAY_MS = 24 * 60 * 60 * 1000;
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = value => Math.round(value);

function weightedFundamentals(inputs) {
  const components = Object.entries(FUNDAMENTAL_WEIGHTS).map(([key, weight]) => {
    const score = Number(inputs[key]);
    return { key, label: SCORE_DESCRIPTIONS[key], score, weight, contribution: score * weight };
  });
  return { value: round(components.reduce((sum, item) => sum + item.contribution, 0)), components };
}

function priceRows(observations, ticker, asOf) {
  const cutoff = Date.parse(asOf);
  return (observations || [])
    .filter(item => item.source === 'prices' && item.type === 'close' && item.ticker === ticker && Date.parse(item.observedAt) <= cutoff && Number.isFinite(Number(item.value)))
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
}

function closestAtOrBefore(rows, target) {
  let candidate = null;
  for (const row of rows) {
    const time = Date.parse(row.observedAt);
    if (time <= target) candidate = row;
    else break;
  }
  return candidate;
}

function periodReturn(rows, asOf, days) {
  if (rows.length < 2) return null;
  const end = rows[rows.length - 1];
  const target = Date.parse(asOf) - days * DAY_MS;
  const start = closestAtOrBefore(rows, target);
  if (!start || start.id === end.id || Number(start.value) <= 0) return null;
  const coverageDays = Math.round((Date.parse(end.observedAt) - Date.parse(start.observedAt)) / DAY_MS);
  if (coverageDays < days * 0.75) return null;
  return { value: Number(end.value) / Number(start.value) - 1, start, end, coverageDays };
}

function realizedVolatility(rows, windowDays = 90) {
  if (rows.length < 10) return null;
  const recent = rows.slice(-Math.min(rows.length, Math.max(10, windowDays)));
  const returns = [];
  for (let i = 1; i < recent.length; i += 1) returns.push(Math.log(Number(recent[i].value) / Number(recent[i - 1].value)));
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / Math.max(1, returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

function marketEmotion(observations, ticker, fallback, asOf) {
  const rows = priceRows(observations, ticker, asOf);
  const r30 = periodReturn(rows, asOf, 30);
  const r90 = periodReturn(rows, asOf, 90);
  const vol = realizedVolatility(rows, 90);
  if (!r30 || !r90 || vol === null) {
    return { value: fallback, mode: 'curated-fallback', components: [], lineage: rows.slice(-1).map(row => row.id).filter(Boolean) };
  }
  const momentum30 = clamp(50 + r30.value * 140);
  const momentum90 = clamp(50 + r90.value * 90);
  const volatilityTemper = clamp(100 - vol * 80);
  const value = round(momentum30 * 0.45 + momentum90 * 0.35 + volatilityTemper * 0.20);
  return {
    value,
    mode: 'market-history',
    components: [
      { key: 'return30D', raw: r30.value, normalized: momentum30, weight: 0.45 },
      { key: 'return90D', raw: r90.value, normalized: momentum90, weight: 0.35 },
      { key: 'realizedVolatility90D', raw: vol, normalized: volatilityTemper, weight: 0.20 },
    ],
    lineage: [r30.start.id, r30.end.id, r90.start.id, r90.end.id].filter(Boolean),
  };
}

function classifyGap(fundamentals, emotion, exposure) {
  const spread = fundamentals - emotion;
  if (spread >= 20) return { label: 'Positive', spread };
  if (emotion >= 70 || (emotion >= 65 && exposure >= 80)) return { label: 'Elevated', spread };
  return { label: 'Balanced', spread };
}

function relevantLineage(observations, ticker, asOf) {
  const cutoff = Date.parse(asOf);
  return (observations || []).filter(item => {
    if (Date.parse(item.observedAt) > cutoff) return false;
    if (item.ticker && item.ticker !== ticker) return false;
    return ['sec', 'company-ir', 'prices'].includes(item.source);
  });
}

function scoreCompany(company, observations = [], asOf = new Date().toISOString()) {
  const input = COMPANY_INPUTS[company.ticker];
  if (!input) throw new Error(`No methodology inputs configured for ${company.ticker}`);
  const fundamentals = weightedFundamentals(input.fundamentals);
  const emotion = marketEmotion(observations, company.ticker, input.fallbackEmotion, asOf);
  const exposure = input.structuralExposure;
  const gap = classifyGap(fundamentals.value, emotion.value, exposure);
  const lineageRows = relevantLineage(observations, company.ticker, asOf);
  const summary = provenanceSummary(lineageRows);
  const confidence = lineageRows.length
    ? clamp(round(input.confidence * 0.7 + Math.min(14, summary.sources.length * 4) + summary.primarySourceRatio * 10), 0, 99)
    : input.confidence;
  const lineage = [...new Set([...emotion.lineage, ...lineageRows.map(item => item.id).filter(Boolean)])];
  return {
    ticker: company.ticker,
    name: company.name,
    methodologyVersion: VERSION,
    asOf,
    calculatedAt: new Date().toISOString(),
    fundamentals: fundamentals.value,
    emotion: emotion.value,
    exposure,
    gap: gap.label,
    confidence,
    scores: {
      fundamentals,
      marketEmotion: emotion,
      dcExposure: { value: exposure, mode: 'curated-structural-exposure-v1' },
      expectationsGap: gap,
    },
    lineage,
    provenance: {
      methodologyVersion: VERSION,
      inputSummary: summary,
      lineage,
      pointInTimeCutoff: asOf,
    },
  };
}

function scoreCompanies(companies, observations = [], asOf = new Date().toISOString()) {
  return (companies || []).map(company => scoreCompany(company, observations, asOf));
}

module.exports = { scoreCompany, scoreCompanies, weightedFundamentals, marketEmotion, classifyGap, periodReturn, VERSION };
