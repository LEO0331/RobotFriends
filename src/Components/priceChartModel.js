import { normalizePriceObservations } from '../signals/registry';
import { latestSourceSegment } from '../signals/series';

export const PRICE_CHART_RANGES = [30, 60, 90];
export const DEFAULT_PRICE_CHART_RANGE = 60;

const normalizeRange = value => PRICE_CHART_RANGES.includes(Number(value))
  ? Number(value)
  : DEFAULT_PRICE_CHART_RANGE;

export function buildPriceChartModel(snapshot = {}, ticker, requestedSessions = DEFAULT_PRICE_CHART_RANGE) {
  const sessions = normalizeRange(requestedSessions);
  if (!Number.isFinite(Date.parse(snapshot.generatedAt || ''))) {
    return {
      available: false,
      reason: 'price-history-missing',
      ticker,
      sessions,
      availableSessions: 0,
      rangeAvailability: Object.fromEntries(PRICE_CHART_RANGES.map(range => [range, false])),
      points: [],
      provider: null,
      sourceUrl: null,
    };
  }
  const rows = normalizePriceObservations(
    snapshot.observations || [],
    ticker,
    snapshot.generatedAt
  );
  const sourceRows = latestSourceSegment(rows);
  const latest = sourceRows[sourceRows.length - 1] || null;
  const rangeAvailability = Object.fromEntries(
    PRICE_CHART_RANGES.map(range => [range, sourceRows.length >= range])
  );

  if (!latest) {
    return {
      available: false,
      reason: 'price-history-missing',
      ticker,
      sessions,
      availableSessions: 0,
      rangeAvailability,
      points: [],
      provider: null,
      sourceUrl: null,
    };
  }

  if (sourceRows.length < sessions) {
    return {
      available: false,
      reason: 'price-history-insufficient',
      ticker,
      sessions,
      availableSessions: sourceRows.length,
      rangeAvailability,
      points: [],
      provider: latest.provider || null,
      sourceUrl: latest.sourceUrl || null,
      observedAt: latest.observedAt,
      latestClose: latest.value,
    };
  }

  const selected = sourceRows.slice(-sessions);
  const first = selected[0];
  const last = selected[selected.length - 1];
  const values = selected.map(row => row.value);
  const low = Math.min(...values);
  const high = Math.max(...values);

  return {
    available: true,
    reason: null,
    ticker,
    sessions,
    availableSessions: sourceRows.length,
    rangeAvailability,
    points: selected.map((row, index) => ({
      index,
      date: row.observedAt.slice(0, 10),
      observedAt: row.observedAt,
      value: row.value,
      id: row.id || null,
    })),
    startDate: first.observedAt,
    endDate: last.observedAt,
    firstClose: first.value,
    latestClose: last.value,
    changePercent: first.value > 0 ? ((last.value / first.value) - 1) * 100 : null,
    low,
    high,
    provider: last.provider || null,
    sourceUrl: last.sourceUrl || null,
  };
}
