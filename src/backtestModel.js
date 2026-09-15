const DAY_MS = 24 * 60 * 60 * 1000;
export const BACKTEST_VERSION = 'gridline-point-in-time-backtest-v1.0.0';

function pricesFor(observations, ticker) {
  return (observations || []).filter(item => item.source === 'prices' && item.type === 'close' && item.ticker === ticker && Number.isFinite(Number(item.value)) && Number.isFinite(Date.parse(item.observedAt))).sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
}
function firstAtOrAfter(rows, timestamp, toleranceDays) {
  const end = timestamp + toleranceDays * DAY_MS;
  return rows.find(item => { const time = Date.parse(item.observedAt); return time >= timestamp && time <= end; }) || null;
}
const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const round4 = value => value === null ? null : Math.round(value * 10000) / 10000;

export function runRecordedBacktest({ ticker, horizonDays = 30 }, history = [], observations = []) {
  const prices = pricesFor(observations, ticker);
  const signals = (history || []).filter(item => item.ticker === ticker && ['Positive', 'Elevated'].includes(item.gap)).sort((a, b) => Date.parse(a.asOf || a.observedAt) - Date.parse(b.asOf || b.observedAt));
  const rows = signals.map(signal => {
    const signalAt = Date.parse(signal.asOf || signal.observedAt);
    const entry = firstAtOrAfter(prices, signalAt, 5);
    const exit = firstAtOrAfter(prices, signalAt + horizonDays * DAY_MS, 7);
    if (!entry) return { signalAt: signal.asOf || signal.observedAt, gap: signal.gap, status: 'no-entry-price' };
    if (!exit) return { signalAt: signal.asOf || signal.observedAt, gap: signal.gap, status: 'pending', entryPrice: Number(entry.value) };
    const forwardReturn = Number(exit.value) / Number(entry.value) - 1;
    const direction = signal.gap === 'Positive' ? 1 : -1;
    return { signalAt: signal.asOf || signal.observedAt, gap: signal.gap, status: 'complete', entryAt: entry.observedAt, exitAt: exit.observedAt, forwardReturn: round4(forwardReturn), directionalReturn: round4(forwardReturn * direction), success: forwardReturn * direction > 0 };
  });
  const complete = rows.filter(row => row.status === 'complete');
  return {
    backtestVersion: BACKTEST_VERSION,
    ticker,
    horizonDays,
    status: complete.length ? 'complete' : 'insufficient-data',
    metrics: {
      sampleSize: complete.length,
      pendingSignals: rows.filter(row => row.status === 'pending').length,
      directionalHitRate: complete.length ? round4(complete.filter(row => row.success).length / complete.length) : null,
      averageDirectionalReturn: round4(average(complete.map(row => row.directionalReturn))),
    },
    rows,
  };
}
