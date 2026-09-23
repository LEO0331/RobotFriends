export const PERIOD_DAYS = { '30D': 30, '90D': 90, '1Y': 365 };

const DAY_MS = 24 * 60 * 60 * 1000;

const toTime = value => {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
};

const httpsUrl = value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
};

export function priceSeries(observations, ticker) {
  const rows = (observations || [])
    .filter(item => item && item.source === 'prices' && item.type === 'close' && item.ticker === ticker && Number.isFinite(Number(item.value)) && Number(item.value) > 0 && toTime(item.observedAt) !== null)
    .map(item => ({
      date: item.observedAt,
      time: toTime(item.observedAt),
      value: Number(item.value),
      sourceUrl: httpsUrl(item.sourceUrl) || httpsUrl(item.provenance?.originUrl),
      providerName: item.providerName || item.provenance?.provider || null,
    }))
    .filter(item => item.sourceUrl)
    .sort((a, b) => a.time - b.time);
  const byDay = new Map();
  rows.forEach(row => byDay.set(new Date(row.time).toISOString().slice(0, 10), row));
  return Array.from(byDay.values());
}

function closestBaseline(rows, targetTime, toleranceDays = 10) {
  if (!rows.length) return null;
  let best = null;
  let distance = Infinity;
  for (const row of rows) {
    const currentDistance = Math.abs(row.time - targetTime);
    if (currentDistance < distance) {
      best = row;
      distance = currentDistance;
    }
  }
  return distance <= toleranceDays * DAY_MS ? best : null;
}

export function computePeriodReturn(observations, ticker, period) {
  const days = PERIOD_DAYS[period];
  const rows = priceSeries(observations, ticker);
  if (!days || rows.length < 2) return { available: false, reason: 'price-history-missing' };
  const latest = rows[rows.length - 1];
  const targetTime = latest.time - days * DAY_MS;
  const baseline = closestBaseline(rows, targetTime);
  if (!baseline || baseline.time >= latest.time || baseline.value === 0 || baseline.sourceUrl !== latest.sourceUrl) return { available: false, reason: 'price-history-insufficient', latest };
  return {
    available: true,
    currentPrice: latest.value,
    baselinePrice: baseline.value,
    returnPct: ((latest.value / baseline.value) - 1) * 100,
    fromDate: baseline.date,
    toDate: latest.date,
    coverageDays: Math.round((latest.time - baseline.time) / DAY_MS),
  };
}

function movingAverage(rows, count) {
  if (rows.length < count) return null;
  return rows.slice(-count).reduce((sum, row) => sum + row.value, 0) / count;
}

export function buildCompanyPeriodView(company, observations, period) {
  const price = computePeriodReturn(observations, company.ticker, period);
  const rows = priceSeries(observations, company.ticker);
  const latestPrice = rows[rows.length - 1] || null;
  const currentPrice = latestPrice ? latestPrice.value : null;
  const latestTen = rows.slice(-10);
  const consistentSource = latestTen.length === 10 && new Set(latestTen.map(row => row.sourceUrl)).size === 1;
  const ma5 = consistentSource ? movingAverage(rows, 5) : null;
  const ma10 = consistentSource ? movingAverage(rows, 10) : null;
  return {
    ticker: company.ticker,
    name: company.name,
    currentPrice,
    periodReturn: price.available ? price.returnPct : null,
    priceHistoryAvailable: price.available,
    priceFromDate: price.fromDate || null,
    priceToDate: latestPrice ? latestPrice.date : null,
    priceSourceUrl: latestPrice ? latestPrice.sourceUrl : null,
    priceProvider: latestPrice ? latestPrice.providerName : null,
    priceCoverageDays: price.coverageDays || null,
    baselinePrice: price.baselinePrice || null,
    ma5,
    ma10,
    marketSignal: ma10 === null ? null : ma5 > ma10 ? 'MA5 > MA10' : ma5 < ma10 ? 'MA5 < MA10' : 'MA5 = MA10',
  };
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function setupCopy(view, period, t) {
  const marketSignal = view.marketSignal === null
    ? t('Unavailable · requires 10 dated closes', '無資料 · 需 10 筆有日期的收盤價')
    : `${view.marketSignal.replace('MA5', `MA5 $${view.ma5.toFixed(2)}`).replace('MA10', `MA10 $${view.ma10.toFixed(2)}`)}`;
  if (view.currentPrice === null) {
    return {
      title: t('Observed price unavailable', '無可用的已觀察價格'),
      body: t(`No valid dated closing price is available for ${view.ticker}.`, `${view.ticker} 沒有有效且附日期的收盤價。`),
      marketSignal,
    };
  }
  if (!view.priceHistoryAvailable) {
    return {
      title: t('Lookback return unavailable', '回溯報酬無資料'),
      body: t(
        `${view.ticker} closed at $${view.currentPrice.toFixed(2)} on ${view.priceToDate.slice(0, 10)}. A close within 10 calendar days of the ${period} baseline is needed to calculate the return.`,
        `${view.ticker} 於 ${view.priceToDate.slice(0, 10)} 的收盤價為 $${view.currentPrice.toFixed(2)}。需有距離 ${period} 基準日不超過 10 個日曆日的收盤價才能計算報酬。`
      ),
      marketSignal,
    };
  }
  return {
    title: t('Observed price change', '已觀察的價格變動'),
    body: t(
      `${view.ticker} moved from $${view.baselinePrice.toFixed(2)} on ${view.priceFromDate.slice(0, 10)} to $${view.currentPrice.toFixed(2)} on ${view.priceToDate.slice(0, 10)}: ${formatPercent(view.periodReturn)}. The baseline is the closest dated close within 10 calendar days of the ${period} target.`,
      `${view.ticker} 從 ${view.priceFromDate.slice(0, 10)} 的 $${view.baselinePrice.toFixed(2)} 變動至 ${view.priceToDate.slice(0, 10)} 的 $${view.currentPrice.toFixed(2)}，報酬為 ${formatPercent(view.periodReturn)}。基準價取距離 ${period} 目標日不超過 10 個日曆日的最近收盤價。`
    ),
    marketSignal,
  };
}
