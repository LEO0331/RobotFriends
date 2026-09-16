const BACKTEST_VERSION = 'gridline-point-in-time-backtest-v1.1.0';
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
function scoreOrigin(score) { return score.origin === 'historical-reconstruction' || score.provenance?.origin === 'historical-reconstruction' ? 'historical-reconstruction' : 'recorded'; }
function lineageValid(score, observationById) {
  const cutoff = scoreTime(score);
  const lineage = score.lineage || score.provenance?.lineage || [];
  if (!lineage.length) return { valid: true, mode: scoreOrigin(score) === 'historical-reconstruction' ? 'reconstruction-no-lineage' : 'recorded-snapshot' };
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
    const origin = scoreOrigin(score);
    const pointInTimeQuality = score.pointInTimeQuality || score.provenance?.pointInTimeQuality || (origin === 'recorded' ? 'recorded' : 'partial');
    if (!audit.valid) { invalidSignals += 1; rows.push({ signalAt: new Date(signalAt).toISOString(), gap, status: 'invalid', audit, origin, pointInTimeQuality }); continue; }
    const entry = firstAtOrAfter(prices, signalAt, 5);
    const exitTarget = signalAt + horizonDays * DAY_MS;
    const exit = firstAtOrAfter(prices, exitTarget, 7);
    if (!entry) { rows.push({ signalAt: new Date(signalAt).toISOString(), gap, status: 'no-entry-price', audit, origin, pointInTimeQuality }); continue; }
    if (!exit) { rows.push({ signalAt: new Date(signalAt).toISOString(), gap, status: 'pending', entryPrice: Number(entry.value), audit, origin, pointInTimeQuality }); continue; }
    const forwardReturn = Number(exit.value) / Number(entry.value) - 1;
    const direction = gap === 'Positive' ? 1 : -1;
    rows.push({
      signalAt: new Date(signalAt).toISOString(), gap, status: 'complete',
      entryAt: entry.observedAt, entryPrice: Number(entry.value), exitAt: exit.observedAt, exitPrice: Number(exit.value),
      forwardReturn: round4(forwardReturn), directionalReturn: round4(forwardReturn * direction), success: forwardReturn * direction > 0, audit,
      methodologyVersion: score.methodologyVersion || 'recorded-snapshot', origin, pointInTimeQuality,
    });
  }
  const complete = rows.filter(row => row.status === 'complete');
  const positive = complete.filter(row => row.gap === 'Positive').map(row => row.forwardReturn);
  const elevated = complete.filter(row => row.gap === 'Elevated').map(row => row.forwardReturn);
  const reconstructedSignals = rows.filter(row => row.origin === 'historical-reconstruction').length;
  const metrics = {
    sampleSize: complete.length,
    pendingSignals: rows.filter(row => row.status === 'pending').length,
    invalidSignals,
    recordedSignals: rows.length - reconstructedSignals,
    reconstructedSignals,
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
      'Recorded rows use native score snapshots captured on their original date.',
      'Historical reconstructions enforce an as-of cutoff for external observations and are labeled as reconstructed.',
      'Reconstructed rows are partial-quality while methodology-v1 fundamental and structural-exposure inputs lack historical-vintage metadata.',
      'Lineage observations dated after a score cutoff invalidate that signal.',
      'Future prices are used only to evaluate a signal after it existed, never to create that signal.',
      'Results are descriptive validation, not evidence of future performance.',
    ],
  };
}

module.exports = { runBacktest, BACKTEST_VERSION, lineageValid };
