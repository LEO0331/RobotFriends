export const BACKTEST_VERSION = 'price-ma5-ma10-retrospective-v1';
const HORIZON_SESSIONS = 10;
const round4 = value => Math.round(value * 10000) / 10000;
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;

function verifiedPriceRows(observations, ticker) {
  const byDay = new Map();
  for (const item of observations || []) {
    const price = Number(item.value);
    const time = Date.parse(item.observedAt);
    let url;
    try { url = new URL(item.sourceUrl); } catch { continue; }
    if (item.source !== 'prices' || item.type !== 'close' || item.ticker !== ticker ||
      !Number.isFinite(price) || price <= 0 || !Number.isFinite(time) ||
      url.protocol !== 'https:') continue;
    const date = new Date(time).toISOString().slice(0, 10);
    // One observation per exchange date. Prefer the most recently retrieved version.
    const old = byDay.get(date);
    if (!old || Date.parse(item.retrievedAt || '') > Date.parse(old.retrievedAt || '')) byDay.set(date, item);
  }
  const rows = [...byDay.values()].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  const latestSource = rows.at(-1)?.sourceUrl;
  return rows.filter(row => row.sourceUrl === latestSource);
}

function meanEndingAt(rows, end, length) {
  let total = 0;
  for (let index = end - length + 1; index <= end; index += 1) total += Number(rows[index].value);
  return total / length;
}

export function runPriceBacktest({ ticker }, observations = []) {
  const prices = verifiedPriceRows(observations, ticker);
  const rows = [];
  for (let index = 10; index < prices.length; index += 1) {
    const previousDifference = meanEndingAt(prices, index - 1, 5) - meanEndingAt(prices, index - 1, 10);
    const ma5 = meanEndingAt(prices, index, 5);
    const ma10 = meanEndingAt(prices, index, 10);
    const difference = ma5 - ma10;
    const direction = previousDifference <= 0 && difference > 0 ? 'bullish'
      : previousDifference >= 0 && difference < 0 ? 'bearish' : null;
    if (!direction) continue;
    const signal = prices[index];
    const entry = prices[index + 1];
    const exit = prices[index + 1 + HORIZON_SESSIONS];
    const base = {
      signalAt: signal.observedAt, direction, ma5: round4(ma5), ma10: round4(ma10),
      signalClose: Number(signal.value), sourceUrl: signal.sourceUrl,
      providerName: signal.providerName || null,
    };
    if (!entry) { rows.push({ ...base, status: 'pending' }); continue; }
    if (!exit) { rows.push({ ...base, status: 'pending', entryAt: entry.observedAt, entryPrice: Number(entry.value) }); continue; }
    const forwardReturn = Number(exit.value) / Number(entry.value) - 1;
    const directionalReturn = forwardReturn * (direction === 'bullish' ? 1 : -1);
    rows.push({ ...base, status: 'complete', entryAt: entry.observedAt, entryPrice: Number(entry.value),
      exitAt: exit.observedAt, exitPrice: Number(exit.value), forwardReturn: round4(forwardReturn),
      directionalReturn: round4(directionalReturn), success: directionalReturn > 0 });
  }
  const complete = rows.filter(row => row.status === 'complete');
  return {
    backtestVersion: BACKTEST_VERSION, ticker, horizonSessions: HORIZON_SESSIONS,
    status: complete.length ? 'complete' : 'insufficient-data',
    coverage: {
      start: prices[0]?.observedAt || null, end: prices[prices.length - 1]?.observedAt || null,
      priceObservations: prices.length, totalSignals: rows.length,
    },
    metrics: {
      sampleSize: complete.length, pendingSignals: rows.length - complete.length,
      directionalHitRate: complete.length ? round4(complete.filter(row => row.success).length / complete.length) : null,
      averageDirectionalReturn: complete.length ? round4(average(complete.map(row => row.directionalReturn))) : null,
    }, rows,
  };
}
