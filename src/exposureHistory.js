export const PERIOD_DAYS = { '30D': 30, '90D': 90, '1Y': 365 };

const DAY_MS = 24 * 60 * 60 * 1000;

const toTime = value => {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
};

export function priceSeries(observations, ticker) {
  return (observations || [])
    .filter(item => item && item.source === 'prices' && item.type === 'close' && item.ticker === ticker && Number.isFinite(Number(item.value)) && toTime(item.observedAt) !== null)
    .map(item => ({ date: item.observedAt, time: toTime(item.observedAt), value: Number(item.value) }))
    .sort((a, b) => a.time - b.time);
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
  if (!baseline || baseline.time >= latest.time || baseline.value === 0) return { available: false, reason: 'price-history-insufficient', latest };
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

export function scoreBaseline(companyHistory, ticker, period, asOf) {
  const days = PERIOD_DAYS[period];
  const asOfTime = toTime(asOf);
  if (!days || asOfTime === null) return null;
  const rows = (companyHistory || [])
    .filter(item => item && item.ticker === ticker && toTime(item.observedAt || item.date) !== null)
    .map(item => ({ ...item, time: toTime(item.observedAt || item.date) }))
    .sort((a, b) => a.time - b.time);
  return closestBaseline(rows, asOfTime - days * DAY_MS, 10);
}

export function buildCompanyPeriodView(company, observations, companyHistory, period, generatedAt) {
  const price = computePeriodReturn(observations, company.ticker, period);
  const currentPrice = price.available ? price.currentPrice : Number(company.price);
  const asOf = price.available ? price.toDate : (generatedAt || new Date().toISOString());
  const baseline = scoreBaseline(companyHistory, company.ticker, period, asOf);
  const scoreHistoryAvailable = Boolean(baseline);
  const emotionDelta = scoreHistoryAvailable && Number.isFinite(Number(baseline.emotion)) ? company.emotion - Number(baseline.emotion) : null;
  const fundamentalsDelta = scoreHistoryAvailable && Number.isFinite(Number(baseline.fundamentals)) ? company.fundamentals - Number(baseline.fundamentals) : null;
  const exposureDelta = scoreHistoryAvailable && Number.isFinite(Number(baseline.exposure)) ? company.exposure - Number(baseline.exposure) : null;
  const currentGapScore = company.fundamentals - company.emotion;
  const baselineGapScore = scoreHistoryAvailable && Number.isFinite(Number(baseline.fundamentals)) && Number.isFinite(Number(baseline.emotion))
    ? Number(baseline.fundamentals) - Number(baseline.emotion)
    : null;
  return {
    ...company,
    currentPrice,
    periodReturn: price.available ? price.returnPct : null,
    priceHistoryAvailable: price.available,
    priceFromDate: price.fromDate || null,
    priceToDate: price.toDate || null,
    priceCoverageDays: price.coverageDays || null,
    scoreHistoryAvailable,
    emotionDelta,
    fundamentalsDelta,
    exposureDelta,
    gapDelta: baselineGapScore === null ? null : currentGapScore - baselineGapScore,
  };
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function formatDelta(value) {
  if (!Number.isFinite(value)) return null;
  return `${value >= 0 ? '+' : ''}${Math.round(value)}`;
}

export function setupCopy(view, period, t) {
  if (!view.priceHistoryAvailable) {
    return {
      title: t('History coverage building', '歷史資料累積中'),
      body: t(
        `The ${period} selector is ready, but this snapshot does not yet contain enough price history for ${view.ticker}. Current fundamentals and exposure remain point-in-time values.`,
        `${period} 篩選已啟用，但目前快照尚未包含 ${view.ticker} 足夠的價格歷史。基本面與曝險仍顯示目前時間點數值。`
      ),
      marketSignal: t('History unavailable', '歷史資料不足'),
    };
  }
  if (view.periodReturn <= -10 && view.fundamentals >= view.emotion + 12) {
    return {
      title: t('Potential positive dislocation', '可能的正向錯價'),
      body: t(
        `${view.ticker} is ${formatPercent(view.periodReturn)} over ${period} while the current fundamentals score remains above market emotion. Confirm that physical capacity and power delivery still support the thesis.`,
        `${view.ticker} 在 ${period} 期間報酬為 ${formatPercent(view.periodReturn)}，目前基本面分數仍高於市場情緒。需確認實體容量與供電交付是否仍支持投資論點。`
      ),
      marketSignal: t('Reset / cautious', '回落 / 審慎'),
    };
  }
  if (view.periodReturn >= 20 && view.emotion >= view.fundamentals - 5) {
    return {
      title: t('Expectations running hot', '市場預期偏熱'),
      body: t(
        `${view.ticker} gained ${formatPercent(view.periodReturn)} over ${period}. Market emotion is close to fundamentals, so future upside depends more heavily on verified delivery and execution.`,
        `${view.ticker} 在 ${period} 期間上漲 ${formatPercent(view.periodReturn)}。市場情緒已接近基本面，後續上行更依賴已驗證的交付與執行力。`
      ),
      marketSignal: t('Elevated', '偏高'),
    };
  }
  return {
    title: t('Mixed expectations signal', '預期訊號分歧'),
    body: t(
      `${view.ticker} returned ${formatPercent(view.periodReturn)} over ${period}. Current fundamentals, data-center exposure and the evidence ledger should be read together before treating the move as confirmation or dislocation.`,
      `${view.ticker} 在 ${period} 期間報酬為 ${formatPercent(view.periodReturn)}。目前基本面、資料中心曝險與證據帳本應一起判讀，不宜單憑價格變動視為確認或錯價。`
    ),
    marketSignal: view.periodReturn >= 0 ? t('Constructive', '偏正向') : t('Cautious', '審慎'),
  };
}
