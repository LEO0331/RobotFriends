import {
  DEFAULT_SIGNAL_METHOD_ID,
  evaluateSignalMethod,
  normalizePriceObservations,
} from './signals/registry';

const legacyTrend = state => ({
  upward: 'above',
  downward: 'below',
  mixed: 'mixed',
  unavailable: 'unavailable',
})[state] || 'unavailable';

export function marketSignals(snapshot, ticker) {
  if (!Number.isFinite(Date.parse(snapshot?.generatedAt || ''))) return null;
  const rows = normalizePriceObservations(snapshot?.observations || [], ticker, snapshot.generatedAt);
  const latest = rows[rows.length - 1];
  if (!latest) return null;

  const previous = rows[rows.length - 2];
  const methodResult = evaluateSignalMethod(DEFAULT_SIGNAL_METHOD_ID, rows);
  const close = latest.value;
  const changePercent = previous ? (close / previous.value - 1) * 100 : null;

  return {
    ticker,
    close,
    changePercent,
    ma5: methodResult.value?.shortAverage ?? null,
    ma10: methodResult.value?.longAverage ?? null,
    trend: legacyTrend(methodResult.state),
    observedAt: latest.observedAt,
    provider: latest.provider,
    sourceUrl: latest.sourceUrl,
    observationIds: methodResult.evidence.observationIds,
    sampleSize: rows.length,
    signalMethodId: methodResult.id,
    signalMethod: methodResult,
  };
}

export function formatUsd(value) {
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : 'Unavailable';
}
