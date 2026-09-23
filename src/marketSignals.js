const mean = rows => rows.reduce((sum, row) => sum + Number(row.value), 0) / rows.length;

export function marketSignals(snapshot, ticker) {
  const cutoff = Date.parse(snapshot?.generatedAt || '');
  const candidates = (snapshot?.observations || [])
    .filter(row => row.source === 'prices' && row.type === 'close' && row.ticker === ticker &&
      Number.isFinite(Number(row.value)) && Number(row.value) > 0 &&
      Number.isFinite(Date.parse(row.observedAt)) && Date.parse(row.observedAt) <= cutoff)
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  const byDay = new Map(candidates.map(row => [row.observedAt.slice(0, 10), row]));
  const rows = [...byDay.values()];
  const latest = rows[rows.length - 1];
  if (!latest) return null;
  const previous = rows[rows.length - 2];
  const urls = rows.slice(-10).map(row => row.provenance?.originUrl || row.sourceUrl).filter(Boolean);
  const consistentSource = urls.length === 10 && new Set(urls).size === 1;
  const ma5 = rows.length >= 10 && consistentSource ? mean(rows.slice(-5)) : null;
  const ma10 = rows.length >= 10 && consistentSource ? mean(rows.slice(-10)) : null;
  const close = Number(latest.value);
  const changePercent = previous ? (close / Number(previous.value) - 1) * 100 : null;
  const trend = ma5 === null || ma10 === null ? 'unavailable'
    : close > ma5 && ma5 > ma10 ? 'above'
      : close < ma5 && ma5 < ma10 ? 'below' : 'mixed';
  return {
    ticker, close, changePercent, ma5, ma10, trend,
    observedAt: latest.observedAt,
    provider: latest.provenance?.provider || latest.providerName || null,
    sourceUrl: latest.provenance?.originUrl || latest.sourceUrl || null,
    observationIds: ma10 === null ? [] : rows.slice(-10).map(row => row.id).filter(Boolean),
    sampleSize: rows.length,
  };
}

export function formatUsd(value) {
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : 'Unavailable';
}
