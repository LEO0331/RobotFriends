const BACKTEST_VERSION = 'gridline-point-in-time-backtest-v1.0.0';
const DAY_MS = 24 * 60 * 60 * 1000;

function sortedPrices(observations, ticker) {
  return (observations || [])
    .filter(item => item.source === 'prices' && item.type === 'close' && item.ticker === ticker && Number.isFinite(Number(item.value)) && Number.isFinite(Date.parse(item.observedAt)))
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
}
function firstAtOrAfter(rows, timestamp, toleranceDays = 5) {
  const end = timestamp + toleranceDays * DAY_MS;
  return rows.find(item => { const time = Date.parse(item.observedAt); return time >= timestamp && time <= end; }) || null;
}
function scoreTime(score) { return Date.parse(score.asOf || score.observedAt || score.calculatedAt); }
function scoreGap(score) { return score.gap || score.scores?.expectationsGap?.label || 'Balanced'; }
function lineageValid(score, observationById) {
  const cutoff = scoreTime(score);
  const lineage = score.lineage || score.provenance?.lineage || [];
  if (!lineage.length) return { valid: true, mode: 'recorded-snapshot' };
  for (const id of lineage) {
    const observation = observationById.get(id);
    if (observation && Date.parse(observation.observedAt) > cutoff) return { valid: false, mode: 'lineage-violation', observationId: id };
  }
  return { valid: true, mode: 'lineage-checked' };
}
function average(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }
function round4(value) { return value === null ? null : Math.round(value * 10000) / 10000; }

function runBacktest(input, scoreSnapshots = [], observations = []) {
  const ticker = String(input.ticker || '').toUpperCase();
  const horizonDays = [30, 90].includes(Number(input.horizonDays)) ? Number(input.horizonDays) : 30;
  if (!ticker) throw new Error('ticker is required');
  const prices = sortedPrices(observations, ticker);
  const observationById = new Map((observations || []).map(item => [item.id, item]));
  const scores = (scoreSnapshots || []).filter(item => item.ticker === ticker).sort((a, b) => scoreTime(a) - scoreTime(b));
  const rows = [];
  let invalidSignals = 0;
  for (const score of scores) {
    const gap = scoreGap(score);
    if (!['Positive', 'Elevated'].includes(gap)) continue;
    const signalAt = scoreTime(score);
    if (!Number.isFinite(signalAt)) continue;
    const audit = lineageValid(score, observationById);
    if (!audit.valid) { invalidSignals += 1; rows.push({ signalAt: new Date(signalAt).toISOString(), gap, status: 'invalid', audit }); continue; }
    const entry = firstAtOrAfter(prices, signalAt, 5);
    const exitTarget = signalAt + horizonDays * DAY_MS;
    const exit = firstAtOrAfter(prices, exitTarget, 7);
    if (!entry) { rows.push({ signalAt: new Date(signalAt).toISOString(), gap, status: 'no-entry-price', audit }); continue; }
    if (!exit) { rows.push({ signalAt: new Date(signalAt).toISOString(), gap, status: 'pending', entryPrice: Number(entry.value), audit }); continue; }
    const forwardReturn = Number(exit.value) / Number(entry.value) - 1;
    const direction = gap === 'Positive' ? 1 : -1;
    rows.push({
      signalAt: new Date(signalAt).toISOString(), gap, status: 'complete',
      entryAt: entry.observedAt, entryPrice: Number(entry.value), exitAt: exit.observedAt, exitPrice: Number(exit.value),
      forwardReturn: round4(forwardReturn), directionalReturn: round4(forwardReturn * direction), success: forwardReturn * direction > 0, audit,
      methodologyVersion: score.methodologyVersion || 'recorded-snapshot',
    });
  }
  const complete = rows.filter(row => row.status === 'complete');
  const positive = complete.filter(row => row.gap === 'Positive').map(row => row.forwardReturn);
  const elevated = complete.filter(row => row.gap === 'Elevated').map(row => row.forwardReturn);
  const metrics = {
    sampleSize: complete.length,
    pendingSignals: rows.filter(row => row.status === 'pending').length,
    invalidSignals,
    directionalHitRate: complete.length ? round4(complete.filter(row => row.success).length / complete.length) : null,
    averageDirectionalReturn: round4(average(complete.map(row => row.directionalReturn))),
    averageForwardReturnPositive: round4(average(positive)),
    averageForwardReturnElevated: round4(average(elevated)),
  };
  return {
    backtestVersion: BACKTEST_VERSION,
    ticker,
    horizonDays,
    generatedAt: new Date().toISOString(),
    status: complete.length ? 'complete' : 'insufficient-data',
    metrics,
    rows,
    guardrails: [
      'Uses only score snapshots recorded at or before each signal timestamp.',
      'Lineage observations dated after a score cutoff invalidate that signal.',
      'No historical proprietary score is reconstructed using current information.',
      'Results are descriptive validation, not evidence of future performance.',
    ],
  };
}

module.exports = { runBacktest, BACKTEST_VERSION, lineageValid };
