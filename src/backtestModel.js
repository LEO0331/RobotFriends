const DAY_MS = 24 * 60 * 60 * 1000;
export const BACKTEST_VERSION = 'gridline-point-in-time-backtest-v1.1.0';

function pricesFor(observations, ticker) {
  return (observations || []).filter(item => item.source === 'prices' && item.type === 'close' && item.ticker === ticker && Number.isFinite(Number(item.value)) && Number.isFinite(Date.parse(item.observedAt))).sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
}
function firstAtOrAfter(rows, timestamp, toleranceDays) {
  const end = timestamp + toleranceDays * DAY_MS;
  return rows.find(item => { const time = Date.parse(item.observedAt); return time >= timestamp && time <= end; }) || null;
}
const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const round4 = value => value === null ? null : Math.round(value * 10000) / 10000;
const signalOrigin = signal => signal.origin === 'historical-reconstruction' ? 'historical-reconstruction' : 'recorded';

export function runRecordedBacktest({ ticker, horizonDays = 30 }, history = [], observations = []) {
  const prices = pricesFor(observations, ticker);
  const signals = (history || []).filter(item => item.ticker === ticker && ['Positive', 'Elevated'].includes(item.gap)).sort((a, b) => Date.parse(a.asOf || a.observedAt) - Date.parse(b.asOf || b.observedAt));
  const rows = signals.map(signal => {
    const rawSignalAt = signal.asOf || signal.observedAt;
    const signalAt = Date.parse(rawSignalAt);
    const origin = signalOrigin(signal);
    const pointInTimeQuality = signal.pointInTimeQuality || (origin === 'recorded' ? 'recorded' : 'partial');
    const base = { signalAt: rawSignalAt, gap: signal.gap, origin, pointInTimeQuality, methodologyVersion: signal.methodologyVersion };
    const entry = firstAtOrAfter(prices, signalAt, 5);
    const exit = firstAtOrAfter(prices, signalAt + horizonDays * DAY_MS, 7);
    if (!entry) return { ...base, status: 'no-entry-price' };
    if (!exit) return { ...base, status: 'pending', entryPrice: Number(entry.value) };
    const forwardReturn = Number(exit.value) / Number(entry.value) - 1;
    const direction = signal.gap === 'Positive' ? 1 : -1;
    return { ...base, status: 'complete', entryAt: entry.observedAt, exitAt: exit.observedAt, forwardReturn: round4(forwardReturn), directionalReturn: round4(forwardReturn * direction), success: forwardReturn * direction > 0 };
  });
  const complete = rows.filter(row => row.status === 'complete');
  const dates = signals.map(item => item.asOf || item.observedAt).filter(Boolean).sort();
  const reconstructedSignals = signals.filter(item => signalOrigin(item) === 'historical-reconstruction').length;
  const recordedSignals = signals.length - reconstructedSignals;
  return {
    backtestVersion: BACKTEST_VERSION,
    ticker,
    horizonDays,
    status: complete.length ? 'complete' : 'insufficient-data',
    coverage: {
      start: dates[0] || null,
      end: dates[dates.length - 1] || null,
      totalSignals: signals.length,
      recordedSignals,
      reconstructedSignals,
      quality: reconstructedSignals ? 'partial' : 'recorded-only',
    },
    metrics: {
      sampleSize: complete.length,
      pendingSignals: rows.filter(row => row.status === 'pending').length,
      directionalHitRate: complete.length ? round4(complete.filter(row => row.success).length / complete.length) : null,
      averageDirectionalReturn: round4(average(complete.map(row => row.directionalReturn))),
    },
    rows,
  };
}
