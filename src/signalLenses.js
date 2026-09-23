import { infrastructureEvents } from './eventModel';
import { marketSignals } from './marketSignals';

export const SIGNAL_LENSES = [
  { id: 'momentum', name: 'Market momentum', nameZh: '市場動能' },
  { id: 'execution', name: 'Company execution', nameZh: '公司執行' },
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
      method: `Mean of 24 typed actual-demand hours on ${day} versus the same UTC weekday one week earlier. Regional load does not isolate data centers.`,
      observedAt: `${day}T23:00:00Z`, sourceUrl: source.toString(), scope: 'PJM region',
    };
  }
  return { available: false, label: 'Grid-demand comparison unavailable', method: 'Requires two complete 24-hour PJM actual-demand days, seven days apart, with an explicit EIA data type and one linked source. Regional load cannot establish data-center demand or secured power.', scope: 'PJM region' };
}

export function signalLens(snapshot, ticker, lensId, now = new Date()) {
  if (lensId === 'momentum') {
    const signal = marketSignals(snapshot, ticker);
    return signal?.trend !== 'unavailable' && signal?.sourceUrl
      ? { available: true, label: signal.trend === 'above' ? 'Price trend above MA5/MA10' : signal.trend === 'below' ? 'Price trend below MA5/MA10' : 'Mixed price trend',
        method: 'Latest close compared with arithmetic means of the last 5 and 10 distinct sourced trading closes.', observedAt: signal.observedAt, sourceUrl: signal.sourceUrl, scope: ticker }
      : { available: false, label: 'Market momentum unavailable', method: 'Requires 10 distinct dated closes from one linked provider.', scope: ticker };
  }
  if (lensId === 'execution') {
    const eps = recentFact(snapshot, ticker, 'dilutedEps');
    const revenue = recentFact(snapshot, ticker, 'revenue');
    const epsPrior = recentFact(snapshot, ticker, 'dilutedEpsPrior');
    const revenuePrior = recentFact(snapshot, ticker, 'revenuePrior');
    if (!eps && !revenue) return { available: false, label: 'Company execution evidence unavailable', method: 'Requires a recent period-aware SEC revenue or diluted EPS fact with an exact source link. No growth claim is made without a comparable prior period.', scope: ticker };
    const pair = comparable(eps, epsPrior) ? [eps, epsPrior, 'Diluted EPS'] : comparable(revenue, revenuePrior) ? [revenue, revenuePrior, 'Revenue'] : null;
    if (pair) {
      const [current, prior, name] = pair;
      const direction = Number(current.value) > Number(prior.value) ? 'increased' : Number(current.value) < Number(prior.value) ? 'decreased' : 'was unchanged';
      return { available: true, label: `${name} ${direction} versus comparable prior-year quarter`,
        method: `Matched ${current.periodStart}–${current.periodEnd} with ${prior.periodStart}–${prior.periodEnd}; same unit, comparable quarter duration and filing-linked records. No earnings-quality or valuation claim is inferred.`,
        observedAt: current.filedAt, sourceUrl: current.sourceUrl || current.provenance?.originUrl,
        additionalSourceUrl: prior.sourceUrl || prior.provenance?.originUrl, scope: ticker };
    }
    const fact = eps || revenue;
    return { available: true, label: eps ? 'Diluted EPS disclosed' : 'Revenue disclosed', method: `Reported ${fact.form || 'filing'} fact for period ending ${fact.periodEnd}; this is a disclosure reference, not an earnings-growth verdict.`, observedAt: fact.filedAt, sourceUrl: fact.sourceUrl || fact.provenance?.originUrl, scope: ticker };
  }
  if (lensId === 'grid') {
    return gridDemandSignal(snapshot);
  }
  const latest = infrastructureEvents(snapshot, now).filter(item => !item.archived)[0];
  return latest ? { available: true, label: latest.title, method: `${latest.category} primary record for ${latest.region}; no numeric impact or company attribution is inferred.`, observedAt: latest.publishedAt, sourceUrl: latest.url, scope: latest.region }
    : { available: false, label: 'No verified current project milestone', method: 'Requires an accessible primary-source record with a matching title, publication date and supporting passage.', scope: 'Sector' };
}
