const BACKTEST_VERSION = 'price-ma5-ma10-retrospective-v1';
const HORIZON_SESSIONS = 10;
const round4 = value => Math.round(value * 10000) / 10000;

function priceRows(observations, ticker) {
  const byDay = new Map();
  for (const row of observations || []) {
    const value = Number(row?.value);
    const time = Date.parse(row?.observedAt);
    const sourceUrl = row?.provenance?.originUrl || row?.sourceUrl;
    let url;
    try { url = new URL(sourceUrl); } catch { continue; }
    if (row.source !== 'prices' || row.type !== 'close' || row.ticker !== ticker ||
        !Number.isFinite(value) || value <= 0 || !Number.isFinite(time) || url.protocol !== 'https:') continue;
    const day = row.observedAt.slice(0, 10);
    const previous = byDay.get(day);
    if (!previous || Date.parse(row.retrievedAt || '') > Date.parse(previous.retrievedAt || '')) byDay.set(day, row);
  }
  const rows = [...byDay.values()].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  const latestSource = rows.at(-1)?.provenance?.originUrl || rows.at(-1)?.sourceUrl;
  return rows.filter(row => (row.provenance?.originUrl || row.sourceUrl) === latestSource);
}

function mean(rows, end, count) {
  let sum = 0;
  for (let index = end - count + 1; index <= end; index += 1) sum += Number(rows[index].value);
  return sum / count;
}

function runBacktest({ ticker }, observations = []) {
  const prices = priceRows(observations, ticker);
  const rows = [];
  for (let index = 10; index < prices.length; index += 1) {
    const previousSpread = mean(prices, index - 1, 5) - mean(prices, index - 1, 10);
    const ma5 = mean(prices, index, 5);
    const ma10 = mean(prices, index, 10);
    const spread = ma5 - ma10;
    const direction = previousSpread <= 0 && spread > 0 ? 'bullish' : previousSpread >= 0 && spread < 0 ? 'bearish' : null;
    if (!direction) continue;
    const signal = prices[index];
    const entry = prices[index + 1];
    const exit = prices[index + 1 + HORIZON_SESSIONS];
    const sourceUrl = signal.provenance?.originUrl || signal.sourceUrl;
    const base = { signalAt: signal.observedAt, direction, ma5: round4(ma5), ma10: round4(ma10), sourceUrl, status: 'pending' };
    if (!entry) { rows.push(base); continue; }
    if (!exit) { rows.push({ ...base, entryAt: entry.observedAt, entryPrice: Number(entry.value) }); continue; }
    const forwardReturn = Number(exit.value) / Number(entry.value) - 1;
    const directionalReturn = forwardReturn * (direction === 'bullish' ? 1 : -1);
    rows.push({ ...base, status: 'complete', entryAt: entry.observedAt, entryPrice: Number(entry.value), exitAt: exit.observedAt,
      exitPrice: Number(exit.value), forwardReturn: round4(forwardReturn), directionalReturn: round4(directionalReturn), success: directionalReturn > 0 });
  }
  const complete = rows.filter(row => row.status === 'complete');
  return {
    backtestVersion: BACKTEST_VERSION, ticker, horizonSessions: HORIZON_SESSIONS,
    status: complete.length ? 'complete' : 'insufficient-data',
    coverage: { start: prices[0]?.observedAt || null, end: prices.at(-1)?.observedAt || null, priceObservations: prices.length, totalSignals: rows.length },
    metrics: { sampleSize: complete.length, pendingSignals: rows.length - complete.length,
      directionalHitRate: complete.length ? round4(complete.filter(row => row.success).length / complete.length) : null,
      averageDirectionalReturn: complete.length ? round4(complete.reduce((sum, row) => sum + row.directionalReturn, 0) / complete.length) : null },
    rows,
    limitations: ['Retrospective closes are not executable entry prices.', 'Costs, slippage, dividends and historical data revisions are not modeled.', 'Overlapping signals are not independent forecasts.'],
  };
}

module.exports = { runBacktest, BACKTEST_VERSION };
