import { infrastructureEvents } from './eventModel';
import { marketSignals } from './marketSignals';

export const SIGNAL_LENSES = [
  { id: 'momentum', name: 'Market momentum', nameZh: '市場動能' },
  { id: 'execution', name: 'Company financials', nameZh: '公司財務' },
  { id: 'grid', name: 'Grid demand', nameZh: '電網需求' },
  { id: 'milestones', name: 'Project milestones', nameZh: '專案里程碑' },
];

const secureUrl = value => {
  try { return new URL(value).protocol === 'https:' ? value : null; } catch { return null; }
};

function recentFact(snapshot, ticker, type) {
  const cutoff = Date.parse(snapshot?.generatedAt || '');
  return (snapshot?.observations || [])
    .filter(row => row.source === 'sec' && row.type === type && row.ticker === ticker &&
      row.unit === (type.startsWith('dilutedEps') ? 'USD/shares' : 'USD') &&
      Number.isFinite(Number(row.value)) && Number.isFinite(Date.parse(row.periodEnd)) &&
      Number.isFinite(Date.parse(row.filedAt)) && Date.parse(row.filedAt) <= cutoff && Date.parse(row.periodEnd) <= cutoff &&
      cutoff - Date.parse(row.periodEnd) <= 400 * 86400000 &&
      secureUrl(row.sourceUrl || row.provenance?.originUrl) &&
      !String(row.sourceUrl || row.provenance?.originUrl).includes('/edgar/search/'))
    .sort((a, b) => String(b.periodEnd).localeCompare(String(a.periodEnd)) || String(b.filedAt).localeCompare(String(a.filedAt)))[0] || null;
}

function comparable(current, previous) {
  if (!current || !previous || Number(previous.value) <= 0) return false;
  const yearGap = (Date.parse(current.periodEnd) - Date.parse(previous.periodEnd)) / 86400000;
  const currentDuration = (Date.parse(current.periodEnd) - Date.parse(current.periodStart)) / 86400000;
  const previousDuration = (Date.parse(previous.periodEnd) - Date.parse(previous.periodStart)) / 86400000;
  return yearGap >= 330 && yearGap <= 400 && currentDuration >= 60 && currentDuration <= 120 &&
    previousDuration >= 60 && previousDuration <= 120 && Math.abs(currentDuration - previousDuration) <= 15;
}

function gridDemandSignal(snapshot) {
  const days = new Map();
  const cutoff = Date.parse(snapshot?.generatedAt || '');
  for (const row of snapshot?.observations || []) {
    if (row.source !== 'eia' || row.type !== 'rtoDemandActual' || row.dataType !== 'D' || row.region !== 'PJM' ||
      !Number.isFinite(Date.parse(row.observedAt)) || Date.parse(row.observedAt) > cutoff || !Number.isFinite(Number(row.value)) || Number(row.value) <= 0 ||
      !secureUrl(row.sourceUrl || row.provenance?.originUrl)) continue;
    const day = String(row.observedAt).slice(0, 10);
    const hour = String(row.observedAt).slice(11, 13);
    if (!days.has(day)) days.set(day, new Map());
    days.get(day).set(hour, row);
  }
  const complete = [...days.entries()].filter(([, hours]) => hours.size === 24).sort(([a], [b]) => b.localeCompare(a));
  for (const [day, hours] of complete) {
    const priorDay = new Date(`${day}T00:00:00Z`);
    priorDay.setUTCDate(priorDay.getUTCDate() - 7);
    const prior = days.get(priorDay.toISOString().slice(0, 10));
    if (!prior || prior.size !== 24) continue;
    const sourceUrls = [...hours.values(), ...prior.values()].map(row => row.sourceUrl || row.provenance?.originUrl);
    const units = new Set([...hours.values(), ...prior.values()].map(row => row.unit));
    if (sourceUrls.some(url => !secureUrl(url)) || units.size !== 1) continue;
    const source = new URL(sourceUrls[0]);
    source.searchParams.set('start', `${priorDay.toISOString().slice(0, 10)}T00`);
    source.searchParams.set('end', `${day}T23`);
    source.searchParams.set('length', '336');
    const average = values => [...values.values()].reduce((sum, row) => sum + Number(row.value), 0) / 24;
    const current = average(hours);
    const baseline = average(prior);
    return {
      available: true,
      label: current > baseline ? 'PJM actual demand above prior week' : current < baseline ? 'PJM actual demand below prior week' : 'PJM actual demand unchanged from prior week',
      labelZh: current > baseline ? 'PJM 實際用電需求高於前一週' : current < baseline ? 'PJM 實際用電需求低於前一週' : 'PJM 實際用電需求與前一週持平',
      method: `Compared PJM's reported actual demand on ${day} with the same weekday a week earlier. Regional load does not isolate data centers.`,
      methodZh: `比較 ${day} 與前一週同日的 PJM 實際用電量。區域用電量無法單獨辨識資料中心需求。`,
      observedAt: `${day}T23:00:00Z`,
      sourceUrl: 'https://www.eia.gov/electricity/gridmonitor/dashboard/electric_overview/balancing_authority/PJM',
      sourceLabel: 'EIA PJM dashboard', sourceLabelZh: 'EIA PJM 電網儀表板', datasetUrl: source.toString(), scope: 'PJM region', scopeZh: 'PJM 區域',
    };
  }
  return { available: false, label: 'Grid-demand comparison unavailable', labelZh: '暫無可比較的電網需求資料', method: 'Requires two complete 24-hour PJM actual-demand days, seven days apart, with an explicit EIA data type and one linked source. Regional load cannot establish data-center demand or secured power.', methodZh: '須有相隔七天、各涵蓋完整 24 小時的 PJM 實際需求資料，並標明 EIA 資料類型及來源連結。區域用電量無法證明資料中心需求或已取得電力。', scope: 'PJM region', scopeZh: 'PJM 區域' };
}

export function signalLens(snapshot, ticker, lensId, now = new Date()) {
  if (lensId === 'momentum') {
    const signal = marketSignals(snapshot, ticker);
    return signal?.trend !== 'unavailable' && signal?.sourceUrl
      ? { available: true, label: signal.trend === 'above' ? 'Short-term price trend: upward' : signal.trend === 'below' ? 'Short-term price trend: downward' : 'Short-term price trend: mixed',
        labelZh: signal.trend === 'above' ? '短期價格趨勢向上' : signal.trend === 'below' ? '短期價格趨勢向下' : '短期價格趨勢混合',
        method: 'Classified from recent sourced closing-price history. This is a descriptive trend signal, not a forecast of future returns.',
        methodZh: '依據具來源的近期收盤價歷史進行分類。此為描述性趨勢訊號，不代表未來報酬預測。',
        observedAt: signal.observedAt, sourceUrl: signal.sourceUrl, scope: ticker, scopeZh: ticker }
      : { available: false, label: 'Market momentum unavailable', labelZh: '暫無市場動能訊號', method: 'Requires 10 distinct dated closes from one linked provider.', methodZh: '須有同一資料來源連結提供的 10 個不同交易日收盤價。', scope: ticker, scopeZh: ticker };
  }
  if (lensId === 'execution') {
    const eps = recentFact(snapshot, ticker, 'dilutedEps');
    const revenue = recentFact(snapshot, ticker, 'revenue');
    const epsPrior = recentFact(snapshot, ticker, 'dilutedEpsPrior');
    const revenuePrior = recentFact(snapshot, ticker, 'revenuePrior');
    if (!eps && !revenue) return { available: false, label: 'Company execution evidence unavailable', labelZh: '暫無可用的公司財務揭露資料', method: 'Requires a recent period-aware SEC revenue or diluted EPS fact with an exact source link. No growth claim is made without a comparable prior period.', methodZh: '須有近期、標明報告期間且附有原始連結的 SEC 營收或稀釋每股盈餘資料。缺少可比較的去年同期資料時，不判定成長。', scope: ticker, scopeZh: ticker };
    const pair = comparable(eps, epsPrior) ? [eps, epsPrior, 'Diluted EPS'] : comparable(revenue, revenuePrior) ? [revenue, revenuePrior, 'Revenue'] : null;
    if (pair) {
      const [current, prior, name] = pair;
      const direction = Number(current.value) > Number(prior.value) ? 'increased' : Number(current.value) < Number(prior.value) ? 'decreased' : 'was unchanged';
      const nameZh = name === 'Diluted EPS' ? '稀釋每股盈餘' : '營收';
      const directionZh = Number(current.value) > Number(prior.value) ? '增加' : Number(current.value) < Number(prior.value) ? '減少' : '持平';
      return { available: true, label: `${name} ${direction} versus comparable prior-year quarter`,
        labelZh: `${nameZh}較去年同期${directionZh}`,
        method: `Matched ${current.periodStart}–${current.periodEnd} with ${prior.periodStart}–${prior.periodEnd}; same unit, comparable quarter duration and filing-linked records. No earnings-quality or valuation claim is inferred.`,
        methodZh: `比較 ${current.periodStart} 至 ${current.periodEnd} 與 ${prior.periodStart} 至 ${prior.periodEnd} 的申報資料；兩期單位相同、季度長度相近。此比較不代表獲利品質或估值判斷。`,
        observedAt: current.filedAt, sourceUrl: current.sourceUrl || current.provenance?.originUrl,
        additionalSourceUrl: prior.sourceUrl || prior.provenance?.originUrl, scope: ticker, scopeZh: ticker };
    }
    const fact = eps || revenue;
    return { available: true, label: eps ? 'Diluted EPS disclosed' : 'Revenue disclosed', labelZh: eps ? '已揭露稀釋每股盈餘' : '已揭露營收', method: `Reported ${fact.form || 'filing'} fact for period ending ${fact.periodEnd}; this is a disclosure reference, not an earnings-growth verdict.`, methodZh: `${fact.form || '申報文件'} 揭露截至 ${fact.periodEnd} 的資料；僅供查閱，不代表獲利成長判斷。`, observedAt: fact.filedAt, sourceUrl: fact.sourceUrl || fact.provenance?.originUrl, scope: ticker, scopeZh: ticker };
  }
  if (lensId === 'grid') {
    return gridDemandSignal(snapshot);
  }
  const latest = infrastructureEvents(snapshot, now).filter(item => !item.archived)[0];
  return latest ? { available: true, label: latest.title, labelZh: latest.title,
      method: `${({ power: 'Power', grid: 'Grid', permit: 'Permit', capex: 'Capital spending' })[String(latest.category).toLowerCase()] || 'Infrastructure'} primary-source record for ${latest.region}; no quantified impact or company attribution is inferred.`,
      methodZh: `${latest.region} 的${({ power: '電力', grid: '電網', permit: '許可', capex: '資本支出' })[String(latest.category).toLowerCase()] || '基礎設施'}原始紀錄；不據此推估量化影響或歸因於個別公司。`,
      observedAt: latest.publishedAt, sourceUrl: latest.url, scope: latest.region, scopeZh: latest.region }
    : { available: false, label: 'No verified current project milestone', labelZh: '目前沒有已核實的專案里程碑', method: 'Requires an accessible primary-source record with a matching title, publication date and supporting passage.', methodZh: '須有可存取的原始來源，且標題、發布日期及內文段落與事件相符。', scope: 'Sector', scopeZh: '產業' };
}
